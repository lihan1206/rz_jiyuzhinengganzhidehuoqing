"""
日志工具模块
提供统一的日志配置和管理
"""

import logging
import logging.handlers
from pathlib import Path
from typing import Optional
import sys


def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    level: str = 'INFO',
    max_size: str = '10MB',
    backup_count: int = 5
) -> logging.Logger:
    """
    设置日志记录器
    
    Args:
        name: 日志记录器名称
        log_file: 日志文件路径
        level: 日志级别
        max_size: 日志文件最大大小
        backup_count: 备份文件数量
        
    Returns:
        配置好的日志记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    if logger.handlers:
        return logger
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        size_map = {'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024}
        size_value = int(''.join(filter(str.isdigit, max_size)))
        size_unit = ''.join(filter(str.isalpha, max_size)).upper()
        max_bytes = size_value * size_map.get(size_unit, 1024*1024)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger
