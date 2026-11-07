import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Tag,
  Message,
  Popconfirm,
  Space,
} from '@arco-design/web-react';
import { request } from './api';
export default function Account({ onSignedOut }: { onSignedOut: () => void }) {
  const [data, setData] = useState<any>(),
    [loading, setLoading] = useState(false);
  const load = () =>
    request('auth/account')
      .then(setData)
      .catch((e) => Message.error(e.message));
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="settings-layout account-layout">
      <Card title="登录账号">
        <p className="card-intro">当前站长：{data?.username}。修改密码后，所有已登录会话会退出。</p>
        <Form
          layout="vertical"
          onSubmit={async (v) => {
            if (v.newPassword !== v.confirmPassword) {
              Message.error('两次输入的新密码不一致');
              return;
            }
            setLoading(true);
            try {
              await request('auth/password', {
                method: 'POST',
                body: JSON.stringify({
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                }),
              });
              Message.success('密码已更新，请重新登录');
              onSignedOut();
            } catch (e: any) {
              Message.error(e.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item field="currentPassword" label="当前密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            field="newPassword"
            label="新密码"
            rules={[{ required: true }, { minLength: 12, message: '至少 12 个字符' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item field="confirmPassword" label="确认新密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            更新密码并退出登录
          </Button>
        </Form>
      </Card>
      <Card title="有效会话">
        <Table
          rowKey="id"
          data={data?.sessions || []}
          pagination={false}
          columns={[
            {
              title: '会话',
              render: (_: unknown, s: any) => (
                <Tag color={s.id === data?.currentSessionId ? 'green' : 'gray'}>
                  {s.id === data?.currentSessionId ? '当前设备' : '其他登录'}
                </Tag>
              ),
            },
            {
              title: '到期时间',
              dataIndex: 'expiresAt',
              render: (v: string) => new Date(v).toLocaleString('zh-CN'),
            },
          ]}
        />
        <Space style={{ marginTop: 20 }}>
          <Popconfirm
            title="结束其他设备上的登录？当前会话保留。"
            onOk={async () => {
              try {
                await request('auth/revoke-others', { method: 'POST' });
                await load();
                Message.success('其他会话已退出');
              } catch (e: any) {
                Message.error(e.message);
              }
            }}
          >
            <Button>退出其他会话</Button>
          </Popconfirm>
          <Button onClick={load}>刷新</Button>
        </Space>
      </Card>
    </div>
  );
}
