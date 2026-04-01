"""
监控指标模块
收集和上报系统指标
"""

import time
from typing import Dict, Optional
from collections import defaultdict
import logging
from prometheus_client import Counter, Histogram, Gauge, start_http_server


class MetricsCollector:
    """
    指标收集器
    
    功能：
    - 收集系统性能指标
    - 支持Prometheus导出
    - 提供指标查询接口
    """
    
    def __init__(self, port: int = 9090):
        """
        初始化指标收集器
        
        Args:
            port: Prometheus导出端口
        """
        self.logger = logging.getLogger(__name__)
        
        self.counters: Dict[str, Counter] = {}
        self.histograms: Dict[str, Histogram] = {}
        self.gauges: Dict[str, Gauge] = {}
        
        self.timers: Dict[str, float] = {}
        self.metrics_data: Dict[str, list] = defaultdict(list)
        
        self._setup_default_metrics()
        
        try:
            start_http_server(port)
            self.logger.info(f"Prometheus指标服务器启动: 端口 {port}")
        except Exception as e:
            self.logger.warning(f"无法启动Prometheus服务器: {str(e)}")
    
    def _setup_default_metrics(self):
        """设置默认指标"""
        self.counters['detection_total'] = Counter(
            'fire_detection_total',
            'Total number of fire detections'
        )
        
        self.counters['detection_errors'] = Counter(
            'fire_detection_errors_total',
            'Total number of detection errors'
        )
        
        self.histograms['detection_latency'] = Histogram(
            'fire_detection_latency_seconds',
            'Detection latency in seconds'
        )
        
        self.gauges['fire_confidence'] = Gauge(
            'fire_detection_confidence',
            'Current fire detection confidence'
        )
        
        self.gauges['detection_level'] = Gauge(
            'fire_detection_level',
            'Current detection level (0-3)'
        )
    
    def increment_counter(self, name: str, value: int = 1):
        """
        增加计数器
        
        Args:
            name: 计数器名称
            value: 增加值
        """
        if name in self.counters:
            self.counters[name].inc(value)
    
    def record_timer(self, name: str):
        """
        记录计时器
        
        Args:
            name: 计时器名称
        """
        if name in self.timers:
            elapsed = time.time() - self.timers[name]
            
            if name in self.histograms:
                self.histograms[name].observe(elapsed)
            
            del self.timers[name]
    
    def start_timer(self, name: str):
        """
        开始计时
        
        Args:
            name: 计时器名称
        """
        self.timers[name] = time.time()
    
    def record_metric(self, name: str, value: float):
        """
        记录指标值
        
        Args:
            name: 指标名称
            value: 指标值
        """
        if name in self.gauges:
            self.gauges[name].set(value)
        
        self.metrics_data[name].append({
            'value': value,
            'timestamp': time.time()
        })
    
    def get_metric_history(self, name: str, limit: int = 100) -> list:
        """
        获取指标历史
        
        Args:
            name: 指标名称
            limit: 返回数量限制
            
        Returns:
            指标历史列表
        """
        return self.metrics_data.get(name, [])[-limit:]
