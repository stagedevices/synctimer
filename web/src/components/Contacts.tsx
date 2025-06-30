import { useState } from 'react';
import {
  Card,
  Button,
  Modal,
  Input,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Avatar,
  Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePeers } from '../hooks/usePeers';
import type { Peer } from '../hooks/usePeers';
import { sendPeerRequest, removePeer } from '../lib/api';
import { auth } from '../lib/firebase';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

export function Contacts() {
  const { peers, loading, error } = usePeers();
  const uid = auth.currentUser?.uid;

  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const sendRequest = async () => {
    if (!uid || !email) return;
    setSending(true);
    try {
      await sendPeerRequest(email, uid);
      message.success('Request sent');
      setModalOpen(false);
      setEmail('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    } finally {
      setSending(false);
    }
  };

  const confirmRemove = (peer: Peer) => {
    Modal.confirm({
      title: 'Remove peer?',
      content: `Are you sure you want to remove ${peer.displayName || peer.email}?`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: () => doRemove(peer.id),
    });
  };

  const doRemove = async (peerUid: string) => {
    if (!uid) return;
    try {
      await removePeer(peerUid, uid);
      message.success('Peer removed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  const glassStyle = {
    borderRadius: '1.5rem',
  } as const;

  return (
    <Card
      title="Peers"
      className="glass-card"
      style={{ ...glassStyle, margin: '2rem' }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Peer
        </Button>
      }
    >
        {loading ? (
          <Spin />
      ) : error ? (
        <Alert type="error" message={error.message} />
      ) : peers.length === 0 ? (
        <div>No peers yet.</div>
      ) : (
        <Row gutter={[16, 16]}>
          <TransitionGroup component={null}>
            {peers.map((p) => (
              <CSSTransition key={p.id} timeout={250} classNames="fade">
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card
                    className="glass-card"
                    style={glassStyle}
                    actions={[<DeleteOutlined key="del" onClick={() => confirmRemove(p)} />]}
                  >
                    <Card.Meta
                      avatar={<Avatar src={p.photoURL} />}
                      title={p.displayName || p.email}
                      description={
                        <>
                          <div>{p.email}</div>
                          <div>{p.linkedAt?.toDate().toLocaleDateString()}</div>
                        </>
                      }
                    />
                    <div style={{ marginTop: 8 }}>
                      {p.tags?.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  </Card>
                </Col>
              </CSSTransition>
            ))}
          </TransitionGroup>
        </Row>
      )}

      <Modal
        title="Add Peer"
        open={modalOpen}
        onOk={sendRequest}
        okText="Send Request"
        confirmLoading={sending}
        onCancel={() => setModalOpen(false)}
      >
        <Input
          placeholder="Peer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onPressEnter={sendRequest}
          autoFocus
        />
      </Modal>
    </Card>
  );
}
