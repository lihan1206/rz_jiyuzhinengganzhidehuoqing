"""
路径规划模块
提供机器人导航和路径规划功能
"""

import numpy as np
from typing import List, Tuple, Optional
import heapq
from dataclasses import dataclass
import logging


@dataclass
class PathNode:
    """路径节点"""
    position: Tuple[int, int]
    g_cost: float
    h_cost: float
    parent: Optional['PathNode'] = None
    
    @property
    def f_cost(self) -> float:
        return self.g_cost + self.h_cost
    
    def __lt__(self, other):
        return self.f_cost < other.f_cost


class PathPlanner:
    """
    路径规划器
    
    功能：
    - A*路径规划算法
    - 避障导航
    - 多目标路径规划
    """
    
    def __init__(self, map_size: Tuple[int, int] = (100, 100), resolution: float = 0.1):
        """
        初始化路径规划器
        
        Args:
            map_size: 地图尺寸
            resolution: 分辨率 (米/像素)
        """
        self.logger = logging.getLogger(__name__)
        self.map_size = map_size
        self.resolution = resolution
        self.obstacle_map = np.zeros(map_size, dtype=np.uint8)
        self.safety_margin = 0
    
    def update_map(self, obstacle_map: np.ndarray):
        """
        更新障碍物地图
        
        Args:
            obstacle_map: 障碍物地图 (0=可通行, 1=障碍物)
        """
        self.obstacle_map = obstacle_map
        self.logger.info("障碍物地图已更新")
    
    def set_safety_margin(self, margin: int):
        """设置安全距离"""
        self.safety_margin = margin
    
    def find_path(
        self, 
        start: Tuple[int, int], 
        goal: Tuple[int, int]
    ) -> Optional[List[Tuple[int, int]]]:
        """
        使用A*算法寻找路径
        
        Args:
            start: 起点坐标
            goal: 终点坐标
            
        Returns:
            路径点列表，如果无法到达则返回None
        """
        if not self._is_valid_position(start) or not self._is_valid_position(goal):
            self.logger.error("起点或终点无效")
            return None
        
        open_set = []
        closed_set = set()
        
        start_node = PathNode(
            position=start,
            g_cost=0,
            h_cost=self._heuristic(start, goal)
        )
        
        heapq.heappush(open_set, start_node)
        
        while open_set:
            current = heapq.heappop(open_set)
            
            if current.position == goal:
                return self._reconstruct_path(current)
            
            closed_set.add(current.position)
            
            for neighbor_pos in self._get_neighbors(current.position):
                if neighbor_pos in closed_set:
                    continue
                
                if not self._is_valid_position(neighbor_pos):
                    continue
                
                g_cost = current.g_cost + self._distance(current.position, neighbor_pos)
                h_cost = self._heuristic(neighbor_pos, goal)
                
                neighbor_node = PathNode(
                    position=neighbor_pos,
                    g_cost=g_cost,
                    h_cost=h_cost,
                    parent=current
                )
                
                heapq.heappush(open_set, neighbor_node)
        
        self.logger.warning("无法找到路径")
        return None
    
    def _heuristic(self, a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """启发式函数（欧几里得距离）"""
        return np.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)
    
    def _distance(self, a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """两点间距离"""
        return np.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)
    
    def _get_neighbors(self, pos: Tuple[int, int]) -> List[Tuple[int, int]]:
        """获取相邻节点（8方向）"""
        directions = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),          (0, 1),
            (1, -1),  (1, 0), (1, 1)
        ]
        
        neighbors = []
        for dx, dy in directions:
            new_pos = (pos[0] + dx, pos[1] + dy)
            neighbors.append(new_pos)
        
        return neighbors
    
    def _is_valid_position(self, pos: Tuple[int, int]) -> bool:
        """检查位置是否有效"""
        x, y = pos
        
        if x < 0 or x >= self.map_size[0] or y < 0 or y >= self.map_size[1]:
            return False
        
        if self.obstacle_map[y, x] == 1:
            return False
        
        if self.safety_margin > 0:
            for dx in range(-self.safety_margin, self.safety_margin + 1):
                for dy in range(-self.safety_margin, self.safety_margin + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.map_size[0] and 0 <= ny < self.map_size[1]:
                        if self.obstacle_map[ny, nx] == 1:
                            return False
        
        return True
    
    def _reconstruct_path(self, node: PathNode) -> List[Tuple[int, int]]:
        """重建路径"""
        path = []
        current = node
        
        while current is not None:
            path.append(current.position)
            current = current.parent
        
        return path[::-1]
    
    def calculate_path_length(self, path: List[Tuple[int, int]]) -> float:
        """计算路径长度"""
        if len(path) < 2:
            return 0.0
        
        length = 0.0
        for i in range(1, len(path)):
            length += self._distance(path[i-1], path[i])
        
        return length * self.resolution
    
    def find_escape_path(
        self, 
        current_pos: Tuple[int, int], 
        danger_pos: Tuple[int, int]
    ) -> Optional[List[Tuple[int, int]]]:
        """
        寻找逃生路径（远离危险区域）
        
        Args:
            current_pos: 当前位置
            danger_pos: 危险位置
            
        Returns:
            逃生路径
        """
        max_distance = 0
        best_goal = None
        
        for x in range(0, self.map_size[0], 10):
            for y in range(0, self.map_size[1], 10):
                if self._is_valid_position((x, y)):
                    distance = self._heuristic((x, y), danger_pos)
                    if distance > max_distance:
                        max_distance = distance
                        best_goal = (x, y)
        
        if best_goal:
            return self.find_path(current_pos, best_goal)
        
        return None
