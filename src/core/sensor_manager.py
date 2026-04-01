"""
传感器管理模块
管理多种传感器设备
"""

import cv2
import numpy as np
from typing import Dict, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum


class SensorType(Enum):
    """传感器类型"""
    CAMERA = "camera"
    THERMAL = "thermal"
    LIDAR = "lidar"
    DEPTH = "depth"


@dataclass
class SensorInfo:
    """传感器信息"""
    name: str
    sensor_type: SensorType
    source: str
    is_active: bool
    resolution: Optional[Tuple[int, int]]


class SensorManager:
    """
    传感器管理器
    
    功能：
    - 管理多种传感器设备
    - 提供统一的传感器接口
    - 处理传感器异常和降级
    """
    
    def __init__(self, config: Dict):
        """
        初始化传感器管理器
        
        Args:
            config: 传感器配置字典
        """
        self.logger = logging.getLogger(__name__)
        self.config = config
        self.sensors: Dict[str, any] = {}
        self.sensor_info: Dict[str, SensorInfo] = {}
        
        self._initialize_sensors()
    
    def _initialize_sensors(self):
        """初始化所有传感器"""
        for sensor_name, sensor_config in self.config.items():
            try:
                sensor_type = SensorType(sensor_config['type'])
                
                if sensor_type == SensorType.CAMERA:
                    sensor = cv2.VideoCapture(sensor_config['source'])
                    if not sensor.isOpened():
                        raise RuntimeError(f"无法打开摄像头: {sensor_config['source']}")
                    
                    self.sensors[sensor_name] = sensor
                    self.sensor_info[sensor_name] = SensorInfo(
                        name=sensor_name,
                        sensor_type=sensor_type,
                        source=sensor_config['source'],
                        is_active=True,
                        resolution=(int(sensor.get(3)), int(sensor.get(4)))
                    )
                    
                self.logger.info(f"传感器初始化成功: {sensor_name}")
                
            except Exception as e:
                self.logger.error(f"传感器初始化失败 {sensor_name}: {str(e)}")
    
    def read(self, sensor_name: str) -> Tuple[bool, Optional[np.ndarray]]:
        """
        从传感器读取数据
        
        Args:
            sensor_name: 传感器名称
            
        Returns:
            (成功标志, 数据)
        """
        if sensor_name not in self.sensors:
            self.logger.error(f"传感器不存在: {sensor_name}")
            return False, None
        
        sensor = self.sensors[sensor_name]
        
        try:
            ret, frame = sensor.read()
            
            if not ret:
                self.logger.warning(f"传感器读取失败: {sensor_name}")
                self.sensor_info[sensor_name].is_active = False
                return False, None
            
            return True, frame
            
        except Exception as e:
            self.logger.error(f"传感器读取异常 {sensor_name}: {str(e)}")
            self.sensor_info[sensor_name].is_active = False
            return False, None
    
    def get_sensor_status(self, sensor_name: str) -> Optional[SensorInfo]:
        """
        获取传感器状态
        
        Args:
            sensor_name: 传感器名称
            
        Returns:
            传感器信息
        """
        return self.sensor_info.get(sensor_name)
    
    def list_active_sensors(self) -> list:
        """列出所有活跃的传感器"""
        return [
            name for name, info in self.sensor_info.items()
            if info.is_active
        ]
    
    def cleanup(self):
        """清理所有传感器资源"""
        for sensor_name, sensor in self.sensors.items():
            try:
                sensor.release()
                self.logger.info(f"传感器已释放: {sensor_name}")
            except Exception as e:
                self.logger.error(f"释放传感器失败 {sensor_name}: {str(e)}")
