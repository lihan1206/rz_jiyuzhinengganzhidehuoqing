"""
火情检测核心模块
提供基于深度学习的火情识别功能
"""

import cv2
import torch
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path
import logging
from enum import Enum
import time

from utils.config_loader import ConfigLoader
from utils.logger import setup_logger
from utils.metrics import MetricsCollector
from models.fire_net import FireNet


class FireDetectionError(Exception):
    """火情检测异常基类"""
    pass


class ModelLoadError(FireDetectionError):
    """模型加载异常"""
    pass


class SensorError(FireDetectionError):
    """传感器异常"""
    pass


class DetectionLevel(Enum):
    """检测等级枚举"""
    NO_FIRE = 0
    SUSPICIOUS = 1
    FIRE_DETECTED = 2
    HIGH_RISK = 3


@dataclass
class DetectionResult:
    """检测结果数据类"""
    level: DetectionLevel
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]]
    timestamp: float
    frame_id: int
    metadata: Dict


class FireDetector:
    """
    火情检测器主类
    
    功能：
    - 加载和管理火情检测模型
    - 处理图像输入并返回检测结果
    - 提供置信度评估和风险等级判断
    - 支持多传感器输入
    """
    
    def __init__(self, config_path: str = "config/default.yaml"):
        """
        初始化火情检测器
        
        Args:
            config_path: 配置文件路径
            
        Raises:
            ModelLoadError: 模型加载失败时抛出
            FileNotFoundError: 配置文件不存在时抛出
        """
        self.logger = setup_logger(__name__)
        self.metrics = MetricsCollector()
        
        try:
            self.config = ConfigLoader.load(config_path)
            self.logger.info(f"配置加载成功: {config_path}")
        except FileNotFoundError as e:
            self.logger.error(f"配置文件不存在: {config_path}")
            raise
        
        self._initialize_model()
        self._initialize_sensors()
        
        self.frame_count = 0
        self.detection_history: List[DetectionResult] = []
        
        self.logger.info("火情检测器初始化完成")
    
    def _initialize_model(self) -> None:
        """初始化深度学习模型"""
        try:
            model_path = self.config['model']['path']
            device = self.config['model'].get('device', 'cuda' if torch.cuda.is_available() else 'cpu')
            
            self.logger.info(f"正在加载模型: {model_path}, 设备: {device}")
            
            self.model = FireNet(
                num_classes=4,
                pretrained=False
            )
            
            if Path(model_path).exists():
                checkpoint = torch.load(model_path, map_location=device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.logger.info(f"模型权重加载成功: {model_path}")
            else:
                raise ModelLoadError(f"模型文件不存在: {model_path}")
            
            self.model.to(device)
            self.model.eval()
            self.device = device
            
        except Exception as e:
            self.logger.error(f"模型初始化失败: {str(e)}")
            raise ModelLoadError(f"模型初始化失败: {str(e)}")
    
    def _initialize_sensors(self) -> None:
        """初始化传感器连接"""
        self.sensors = {}
        sensor_config = self.config.get('sensors', {})
        
        for sensor_name, sensor_info in sensor_config.items():
            try:
                if sensor_info['type'] == 'camera':
                    sensor = cv2.VideoCapture(sensor_info['source'])
                    if not sensor.isOpened():
                        raise SensorError(f"无法打开摄像头: {sensor_info['source']}")
                    self.sensors[sensor_name] = sensor
                    self.logger.info(f"传感器初始化成功: {sensor_name}")
            except Exception as e:
                self.logger.error(f"传感器初始化失败 {sensor_name}: {str(e)}")
                if self.config['system'].get('strict_sensor_check', False):
                    raise
    
    def detect(self, image: np.ndarray) -> DetectionResult:
        """
        对输入图像进行火情检测
        
        Args:
            image: 输入图像，BGR格式，shape为(H, W, 3)
            
        Returns:
            DetectionResult: 检测结果对象
            
        Raises:
            FireDetectionError: 检测过程出错时抛出
        """
        if image is None or image.size == 0:
            raise FireDetectionError("输入图像无效")
        
        try:
            self.metrics.start_timer('detection')
            
            preprocessed = self._preprocess_image(image)
            
            with torch.no_grad():
                outputs = self.model(preprocessed.to(self.device))
                probabilities = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
                
            level = DetectionLevel(predicted.item())
            confidence_value = confidence.item()
            
            bbox = None
            if level != DetectionLevel.NO_FIRE:
                bbox = self._localize_fire(image, preprocessed)
            
            result = DetectionResult(
                level=level,
                confidence=confidence_value,
                bbox=bbox,
                timestamp=time.time(),
                frame_id=self.frame_count,
                metadata={
                    'model_version': self.config['model']['version'],
                    'device': self.device
                }
            )
            
            self.detection_history.append(result)
            self.frame_count += 1
            
            self.metrics.record_timer('detection')
            self.metrics.record_metric('fire_confidence', confidence_value)
            self.metrics.record_metric('detection_level', level.value)
            
            if level.value >= DetectionLevel.FIRE_DETECTED.value:
                self.logger.warning(
                    f"检测到火情! 等级: {level.name}, 置信度: {confidence_value:.2%}"
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"检测过程出错: {str(e)}")
            self.metrics.increment_counter('detection_errors')
            raise FireDetectionError(f"检测失败: {str(e)}")
    
    def _preprocess_image(self, image: np.ndarray) -> torch.Tensor:
        """
        图像预处理
        
        Args:
            image: 原始图像
            
        Returns:
            处理后的张量
        """
        target_size = self.config['model']['input_size']
        
        resized = cv2.resize(image, (target_size, target_size))
        
        rgb_image = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        normalized = rgb_image.astype(np.float32) / 255.0
        
        tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0)
        
        return tensor
    
    def _localize_fire(
        self, 
        original: np.ndarray, 
        preprocessed: torch.Tensor
    ) -> Tuple[int, int, int, int]:
        """
        定位火情区域
        
        Args:
            original: 原始图像
            preprocessed: 预处理后的张量
            
        Returns:
            边界框坐标 (x1, y1, x2, y2)
        """
        activation_map = self._get_activation_map(preprocessed)
        
        heatmap = cv2.resize(activation_map, (original.shape[1], original.shape[0]))
        
        threshold = self.config['detection'].get('localization_threshold', 0.5)
        binary_map = (heatmap > threshold).astype(np.uint8) * 255
        
        contours, _ = cv2.findContours(binary_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            return (x, y, x + w, y + h)
        
        return (0, 0, original.shape[1], original.shape[0])
    
    def _get_activation_map(self, tensor: torch.Tensor) -> np.ndarray:
        """获取模型激活图"""
        activation = self.model.get_activation(tensor)
        activation = activation.squeeze().cpu().numpy()
        activation = np.mean(activation, axis=0)
        activation = (activation - activation.min()) / (activation.max() - activation.min() + 1e-8)
        return activation
    
    def detect_from_sensor(self, sensor_name: str = 'default') -> DetectionResult:
        """
        从指定传感器读取并检测
        
        Args:
            sensor_name: 传感器名称
            
        Returns:
            检测结果
            
        Raises:
            SensorError: 传感器异常时抛出
        """
        if sensor_name not in self.sensors:
            raise SensorError(f"传感器不存在: {sensor_name}")
        
        sensor = self.sensors[sensor_name]
        ret, frame = sensor.read()
        
        if not ret or frame is None:
            self.logger.error(f"传感器读取失败: {sensor_name}")
            raise SensorError(f"无法从传感器读取数据: {sensor_name}")
        
        return self.detect(frame)
    
    def get_statistics(self) -> Dict:
        """
        获取检测统计信息
        
        Returns:
            统计数据字典
        """
        if not self.detection_history:
            return {}
        
        levels = [r.level.value for r in self.detection_history]
        confidences = [r.confidence for r in self.detection_history]
        
        return {
            'total_frames': self.frame_count,
            'fire_detections': sum(1 for l in levels if l >= DetectionLevel.FIRE_DETECTED.value),
            'average_confidence': np.mean(confidences),
            'max_confidence': np.max(confidences),
            'detection_distribution': {
                level.name: levels.count(level.value) 
                for level in DetectionLevel
            }
        }
    
    def cleanup(self) -> None:
        """清理资源"""
        self.logger.info("正在清理资源...")
        
        for sensor_name, sensor in self.sensors.items():
            try:
                sensor.release()
                self.logger.info(f"传感器已释放: {sensor_name}")
            except Exception as e:
                self.logger.error(f"释放传感器失败 {sensor_name}: {str(e)}")
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.logger.info("资源清理完成")
    
    def __enter__(self):
        """上下文管理器入口"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器退出"""
        self.cleanup()
        return False


def main():
    """主函数示例"""
    detector = None
    try:
        detector = FireDetector(config_path="config/production.yaml")
        
        for i in range(100):
            result = detector.detect_from_sensor('default')
            
            print(f"帧 {i}: {result.level.name}, 置信度: {result.confidence:.2%}")
            
            if result.level == DetectionLevel.FIRE_DETECTED:
                print(f"⚠️ 警告: 检测到火情! 位置: {result.bbox}")
            
            time.sleep(0.1)
        
        stats = detector.get_statistics()
        print(f"\n统计信息: {stats}")
        
    except KeyboardInterrupt:
        print("\n用户中断")
    except Exception as e:
        print(f"程序异常: {str(e)}")
    finally:
        if detector:
            detector.cleanup()


if __name__ == "__main__":
    main()
