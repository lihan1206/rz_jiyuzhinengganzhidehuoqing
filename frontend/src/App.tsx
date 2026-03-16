import { DeleteOutlined, ExclamationCircleFilled, FireOutlined, LogoutOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  notification,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  createFireEvent,
  deleteFireEvent,
  getFireEvents,
  getOperationLogs,
  getOverview,
  getRobotStatus,
  updateFireEventStatus
} from "./api/fire";
import { login } from "./api/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "./api/client";
import type { FireEvent, FireEventStatus, FireIntensity } from "./types";
import "./styles.css";

const { Header, Content, Footer } = Layout;

const intensityText: Record<FireIntensity, string> = {
  low: "低",
  medium: "中",
  high: "高"
};

const statusText: Record<FireEventStatus, string> = {
  detected: "已检测",
  extinguished: "已扑灭",
  failed: "处置失败"
};

const robotStatusText: Record<string, string> = {
  moving: "移动中",
  idle: "空闲",
  working: "作业中",
  charging: "充电中"
};

const logTypeText: Record<string, string> = {
  system_boot: "系统启动",
  sensor_ready: "传感器就绪",
  model_ready: "模型就绪",
  fire_event_created: "火情新增",
  fire_event_status_updated: "火情状态更新",
  fire_event_deleted: "火情删除",
  robot_status_updated: "机器人状态更新"
};

const formSchema = z.object({
  eventTime: z.string().min(1, "请选择事件时间"),
  locationX: z.coerce.number(),
  locationY: z.coerce.number(),
  locationZ: z.coerce.number(),
  fireIntensity: z.enum(["low", "medium", "high"]),
  temperature: z.coerce.number().min(0, "温度不能小于 0"),
  smoke: z.coerce.number().min(0, "烟雾浓度不能小于 0"),
  co: z.coerce.number().min(0, "CO 浓度不能小于 0"),
  actionTaken: z.string().max(100, "处置说明不超过 100 字").optional()
});

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码")
});

function useErrorNotice(error: Error | null, title: string) {
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (error) {
      api.error({
        message: title,
        description: error.message
      });
    }
  }, [api, error, title]);

  return contextHolder;
}

export default function App() {
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [statusFilter, setStatusFilter] = useState<FireEventStatus | undefined>();
  const [intensityFilter, setIntensityFilter] = useState<FireIntensity | undefined>();
  const [token, setToken] = useState(() => getAuthToken());
  const [username, setUsername] = useState(() => localStorage.getItem("fire_control_username") ?? "");

  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = notification.useNotification();
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    const onAuthExpired = () => {
      setToken("");
      setUsername("");
      localStorage.removeItem("fire_control_username");
      messageApi.warning({ message: "登录已失效，请重新登录" });
    };

    window.addEventListener("auth-expired", onAuthExpired);
    return () => window.removeEventListener("auth-expired", onAuthExpired);
  }, [messageApi]);

  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: getOverview,
    refetchInterval: 10000,
    enabled: isAuthenticated
  });

  const fireEventQuery = useQuery({
    queryKey: ["fire-events", page, pageSize, statusFilter, intensityFilter],
    queryFn: () => getFireEvents({ page, pageSize, status: statusFilter, intensity: intensityFilter }),
    enabled: isAuthenticated
  });

  const robotQuery = useQuery({
    queryKey: ["robot-status"],
    queryFn: getRobotStatus,
    refetchInterval: 10000,
    enabled: isAuthenticated
  });

  const logsQuery = useQuery({
    queryKey: ["operation-logs"],
    queryFn: () => getOperationLogs(12),
    refetchInterval: 10000,
    enabled: isAuthenticated
  });

  const overviewErrorNotice = useErrorNotice(overviewQuery.error as Error | null, "总览数据加载失败");
  const fireErrorNotice = useErrorNotice(fireEventQuery.error as Error | null, "火情列表加载失败");
  const robotErrorNotice = useErrorNotice(robotQuery.error as Error | null, "机器人状态加载失败");
  const logsErrorNotice = useErrorNotice(logsQuery.error as Error | null, "日志加载失败");

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuthToken(data.token);
      localStorage.setItem("fire_control_username", data.user.username);
      setToken(data.token);
      setUsername(data.user.username);
      messageApi.success({ message: "登录成功" });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      messageApi.error({ message: "登录失败", description: error.message });
    }
  });

  const createMutation = useMutation({
    mutationFn: createFireEvent,
    onSuccess: () => {
      messageApi.success({ message: "新增火情事件成功" });
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["fire-events"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["operation-logs"] });
    },
    onError: (error: Error) => {
      messageApi.error({ message: "新增失败", description: error.message });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: FireEventStatus }) => updateFireEventStatus(id, { status }),
    onSuccess: () => {
      messageApi.success({ message: "状态更新成功" });
      queryClient.invalidateQueries({ queryKey: ["fire-events"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["operation-logs"] });
    },
    onError: (error: Error) => {
      messageApi.error({ message: "状态更新失败", description: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFireEvent,
    onSuccess: () => {
      messageApi.success({ message: "删除成功" });
      queryClient.invalidateQueries({ queryKey: ["fire-events"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["operation-logs"] });
    },
    onError: (error: Error) => {
      messageApi.error({ message: "删除失败", description: error.message });
    }
  });

  const handleLogin = (values: Record<string, unknown>) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      messageApi.warning({ message: parsed.error.issues[0]?.message ?? "登录信息不完整" });
      return;
    }

    loginMutation.mutate({ username: parsed.data.username, password: parsed.data.password });
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem("fire_control_username");
    setToken("");
    setUsername("");
    queryClient.clear();
    messageApi.success({ message: "已退出登录" });
  };

  const handleCreate = (values: Record<string, unknown>) => {
    const normalizedValues = {
      ...values,
      eventTime: dayjs.isDayjs(values.eventTime) ? values.eventTime.toISOString() : values.eventTime
    };

    const parsed = formSchema.safeParse(normalizedValues);
    if (!parsed.success) {
      messageApi.warning({ message: parsed.error.issues[0]?.message ?? "输入校验失败" });
      return;
    }

    createMutation.mutate({
      eventTime: parsed.data.eventTime,
      locationX: parsed.data.locationX,
      locationY: parsed.data.locationY,
      locationZ: parsed.data.locationZ,
      fireIntensity: parsed.data.fireIntensity,
      sensorData: {
        temperature: parsed.data.temperature,
        smoke: parsed.data.smoke,
        co: parsed.data.co
      },
      actionTaken: parsed.data.actionTaken || undefined
    });
  };

  const openDeleteConfirm = (event: FireEvent) => {
    Modal.confirm({
      title: "确认删除火情事件",
      icon: <ExclamationCircleFilled style={{ color: "#d4380d" }} />,
      content: (
        <div className="delete-confirm-panel">
          <Typography.Paragraph>
            该操作会永久删除事件 <strong>#{event.id}</strong>，删除后无法恢复。
          </Typography.Paragraph>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="火势等级">{intensityText[event.fireIntensity]}</Descriptions.Item>
            <Descriptions.Item label="当前状态">{statusText[event.status]}</Descriptions.Item>
            <Descriptions.Item label="坐标">
              ({event.locationX}, {event.locationY}, {event.locationZ})
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(event.id)
    });
  };

  const columns = [
    {
      title: "事件ID",
      dataIndex: "id",
      width: 90
    },
    {
      title: "事件时间",
      dataIndex: "eventTime",
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      title: "火势等级",
      dataIndex: "fireIntensity",
      render: (value: FireIntensity) => {
        const color = value === "high" ? "red" : value === "medium" ? "orange" : "green";
        return <Tag color={color}>{intensityText[value]}</Tag>;
      }
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (value: FireEventStatus) => <Badge status={value === "extinguished" ? "success" : value === "failed" ? "error" : "processing"} text={statusText[value]} />
    },
    {
      title: "坐标",
      render: (_: unknown, record: FireEvent) => `(${record.locationX}, ${record.locationY}, ${record.locationZ})`
    },
    {
      title: "处置动作",
      dataIndex: "actionTaken",
      ellipsis: true,
      render: (value?: string) => value || "-"
    },
    {
      title: "操作",
      width: 220,
      render: (_: unknown, record: FireEvent) => (
        <Space>
          <Button size="small" type="primary" onClick={() => statusMutation.mutate({ id: record.id, status: "extinguished" })}>
            标记已扑灭
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => openDeleteConfirm(record)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  if (!isAuthenticated) {
    return (
      <Layout className="app-shell login-shell">
        {messageContextHolder}
        <Card className="login-card" title="系统登录" extra={<Tag color="blue">安全访问</Tag>}>
          <Typography.Paragraph type="secondary">
            请输入账号密码后进入智能感知火情控制系统。
          </Typography.Paragraph>
          <Form
            form={loginForm}
            layout="vertical"
            onFinish={handleLogin}
            initialValues={{ username: "admin", password: "123456" }}
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input placeholder="请输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginMutation.isPending}>
              登录系统
            </Button>
          </Form>
          <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }} type="secondary">
            测试账号：admin / 123456
          </Typography.Paragraph>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout className="app-shell">
      {messageContextHolder}
      {overviewErrorNotice}
      {fireErrorNotice}
      {robotErrorNotice}
      {logsErrorNotice}

      <Header className="app-header">
        <Typography.Title level={3} className="title">
          <FireOutlined /> 智能感知火情自主识别与精准灭火控制系统
        </Typography.Title>
        <Space>
          <Tag color="cyan">当前用户：{username || "管理员"}</Tag>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries()}>
            刷新数据
          </Button>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </Space>
      </Header>

      <Content className="app-main">
        <main>
          <section className="section-block">
            <Row gutter={[16, 16]}>
              {overviewQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                      <Card>
                        <Skeleton active paragraph={false} />
                      </Card>
                    </Col>
                  ))
                : (
                  <>
                    <Col xs={24} sm={12} lg={6}>
                      <Card><Statistic title="火情总数" value={overviewQuery.data?.totalFires ?? 0} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card><Statistic title="待处置火情" value={overviewQuery.data?.activeFires ?? 0} valueStyle={{ color: "#cf1322" }} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card><Statistic title="已扑灭火情" value={overviewQuery.data?.extinguishedFires ?? 0} valueStyle={{ color: "#389e0d" }} /></Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card><Statistic title="在线机器人" value={overviewQuery.data?.totalRobots ?? 0} /></Card>
                    </Col>
                  </>
                )}
            </Row>
          </section>

          <section className="section-grid">
            <Card title="新增火情事件" className="panel-card" extra={<Tag color="blue">实时录入</Tag>}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreate}
                initialValues={{ fireIntensity: "low", eventTime: dayjs() }}
              >
                <Form.Item name="eventTime" label="事件时间" rules={[{ required: true, message: "请选择事件时间" }]}>
                  <DatePicker showTime style={{ width: "100%" }} format="YYYY-MM-DD HH:mm:ss" />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="locationX" label="X 坐标" rules={[{ required: true, message: "请输入 X" }]}>
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="locationY" label="Y 坐标" rules={[{ required: true, message: "请输入 Y" }]}>
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="locationZ" label="Z 坐标" rules={[{ required: true, message: "请输入 Z" }]}>
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="fireIntensity" label="火势等级" rules={[{ required: true, message: "请选择等级" }]}>
                  <Select
                    options={[
                      { value: "low", label: "低" },
                      { value: "medium", label: "中" },
                      { value: "high", label: "高" }
                    ]}
                  />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="temperature" label="温度" rules={[{ required: true, message: "请输入温度" }]}>
                      <InputNumber style={{ width: "100%" }} addonAfter="℃" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="smoke" label="烟雾浓度" rules={[{ required: true, message: "请输入烟雾" }]}>
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="co" label="CO 浓度" rules={[{ required: true, message: "请输入 CO" }]}>
                      <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="actionTaken" label="处置说明">
                  <Input.TextArea rows={2} placeholder="例如：云台定位并准备喷射" maxLength={100} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
                  提交事件
                </Button>
              </Form>
            </Card>

            <Card title="机器人状态" className="panel-card" extra={<Tag color="geekblue">实时监控</Tag>}>
              {robotQuery.isLoading ? (
                <Skeleton active />
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  {robotQuery.data?.map((robot) => (
                    <Card key={robot.robotId} size="small" className="inner-card">
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="机器人编号">{robot.robotId}</Descriptions.Item>
                        <Descriptions.Item label="当前状态">{robotStatusText[robot.status]}</Descriptions.Item>
                        <Descriptions.Item label="电量">{robot.batteryLevel}%</Descriptions.Item>
                        <Descriptions.Item label="位置">
                          ({robot.positionX}, {robot.positionY})
                        </Descriptions.Item>
                        <Descriptions.Item label="朝向角">{robot.orientation}°</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </section>

          <section className="section-block">
            <Card
              title="火情事件列表"
              extra={
                <Space>
                  <Select
                    allowClear
                    placeholder="状态筛选"
                    style={{ width: 130 }}
                    onChange={(value) => {
                      setPage(1);
                      setStatusFilter(value);
                    }}
                    options={[
                      { label: "已检测", value: "detected" },
                      { label: "已扑灭", value: "extinguished" },
                      { label: "处置失败", value: "failed" }
                    ]}
                  />
                  <Select
                    allowClear
                    placeholder="等级筛选"
                    style={{ width: 130 }}
                    onChange={(value) => {
                      setPage(1);
                      setIntensityFilter(value);
                    }}
                    options={[
                      { label: "低", value: "low" },
                      { label: "中", value: "medium" },
                      { label: "高", value: "high" }
                    ]}
                  />
                </Space>
              }
            >
              <Table
                rowKey="id"
                loading={fireEventQuery.isLoading}
                columns={columns}
                dataSource={fireEventQuery.data?.items ?? []}
                scroll={{ x: 1100 }}
                pagination={{
                  current: page,
                  pageSize,
                  total: fireEventQuery.data?.total ?? 0,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                  }
                }}
              />
            </Card>
          </section>

          <section className="section-block">
            <Card title="最新操作日志" extra={<Tag color="purple">系统审计</Tag>}>
              {logsQuery.isLoading ? (
                <Skeleton active />
              ) : (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {logsQuery.data?.map((log) => (
                    <Card key={log.id} size="small" className="inner-card">
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>{log.description}</Typography.Text>
                        <Typography.Text type="secondary">
                          类型：{logTypeText[log.eventType] ?? "系统事件"} | 时间：{dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                        </Typography.Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </section>
        </main>
      </Content>

      <Footer className="app-footer">智能感知火情控制系统 · 数据来自实时数据库</Footer>
    </Layout>
  );
}
