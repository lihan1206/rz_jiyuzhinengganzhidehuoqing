"""
配置加载工具模块
支持YAML配置文件的加载和验证
"""

import yaml
from pathlib import Path
from typing import Dict, Any
import logging
from dataclasses import dataclass


logger = logging.getLogger(__name__)


class ConfigError(Exception):
    """配置错误异常"""
    pass


@dataclass
class ModelConfig:
    """模型配置"""
    path: str
    version: str
    input_size: int = 224
    device: str = 'cuda'
    num_classes: int = 4


@dataclass
class SensorConfig:
    """传感器配置"""
    name: str
    type: str
    source: str
    enabled: bool = True


class ConfigLoader:
    """
    配置加载器
    
    功能：
    - 加载YAML配置文件
    - 合并多环境配置
    - 验证配置完整性
    """
    
    DEFAULT_CONFIG = {
        'model': {
            'path': 'models/pretrained/fire_net_v1.pth',
            'version': '1.0.0',
            'input_size': 224,
            'device': 'auto'
        },
        'detection': {
            'confidence_threshold': 0.7,
            'localization_threshold': 0.5,
            'history_size': 1000
        },
        'sensors': {},
        'logging': {
            'level': 'INFO',
            'file': 'logs/app/fire_detection.log',
            'max_size': '10MB',
            'backup_count': 5
        },
        'system': {
            'strict_sensor_check': False,
            'auto_recovery': True
        }
    }
    
    @staticmethod
    def load(config_path: str, env: str = None) -> Dict[str, Any]:
        """
        加载配置文件
        
        Args:
            config_path: 配置文件路径
            env: 环境名称
            
        Returns:
            配置字典
            
        Raises:
            FileNotFoundError: 配置文件不存在
            ConfigError: 配置验证失败
        """
        path = Path(config_path)
        
        if not path.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        config = ConfigLoader._merge_with_defaults(config)
        
        if env:
            env_config_path = path.parent / f"{env}.yaml"
            if env_config_path.exists():
                with open(env_config_path, 'r', encoding='utf-8') as f:
                    env_config = yaml.safe_load(f)
                    config = ConfigLoader._deep_merge(config, env_config)
        
        ConfigLoader._validate_config(config)
        
        logger.info(f"配置加载成功: {config_path}")
        return config
    
    @staticmethod
    def _merge_with_defaults(config: Dict) -> Dict:
        """合并默认配置"""
        return ConfigLoader._deep_merge(ConfigLoader.DEFAULT_CONFIG.copy(), config)
    
    @staticmethod
    def _deep_merge(base: Dict, override: Dict) -> Dict:
        """深度合并字典"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = ConfigLoader._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    @staticmethod
    def _validate_config(config: Dict) -> None:
        """验证配置完整性"""
        required_keys = ['model', 'detection']
        
        for key in required_keys:
            if key not in config:
                raise ConfigError(f"缺少必需的配置项: {key}")
        
        if 'path' not in config['model']:
            raise ConfigError("模型配置缺少 'path' 字段")
        
        logger.debug("配置验证通过")
