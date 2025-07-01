import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, List, Avatar, Button, Spin, Tag as AntTag } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, type DocumentData } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';

interface TagInfo {
  id: string;
  name: string;
  type?: string;
  memberCount?: number;
}

interface MemberInfo {
  id: string;
  displayName?: string;
  photoURL?: string;
  pronouns?: string;
}

export function TagDetail() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const reduce = useReducedMotion() ?? false;

  const [tag, setTag] = useState<TagInfo | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const joined = members.some(m => m.id === uid);

  const join = useCallback(async () => {
    if (!uid || !tagId) return;
    await setDoc(doc(db, 'tags', tagId, 'members', uid), {});
    await setDoc(doc(db, 'users', uid, 'tags', tagId), { name: tagId });
  }, [uid, tagId]);

  const leave = useCallback(async () => {
    if (!uid || !tagId) return;
    await deleteDoc(doc(db, 'tags', tagId, 'members', uid));
    await deleteDoc(doc(db, 'users', uid, 'tags', tagId));
  }, [uid, tagId]);

  useEffect(() => {
    (async () => {
      if (!tagId) return;
      const t = await getDoc(doc(db, 'tags', tagId));
      if (t.exists()) setTag({ id: t.id, ...(t.data() as Record<string, unknown>) } as TagInfo);
      const snap = await getDocs(collection(db, 'tags', tagId, 'members'));
      const arr: MemberInfo[] = [];
      for (const d of snap.docs) {
        const u = await getDoc(doc(db, 'users', d.id));
        if (u.exists()) arr.push({ id: d.id, ...(u.data() as DocumentData) });
      }
      setMembers(arr);
      setLoading(false);
    })();
  }, [tagId]);

  if (!uid) return <Spin />;
  if (loading || !tag) return <Spin />;

  return (
    <Card
      title={`#${tag.name}`}
      className="glass-card"
      style={{ margin: '2rem' }}
      extra={<Button onClick={() => navigate('/explore')}>Back</Button>}
      actions={[
        <Button key="join" type={joined ? 'default' : 'primary'} onClick={joined ? leave : join}>
          {joined ? 'Leave' : 'Join'}
        </Button>,
      ]}
    >
      <p style={{ marginBottom: 16 }}>
        <AntTag style={{ marginRight: 8 }}>{tag.type || 'tag'}</AntTag>
        {tag.memberCount ?? members.length} members
      </p>
      <motion.div variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }} initial="show" animate="show">
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={members}
          renderItem={memb => (
            <motion.div variants={cardVariants(reduce)} key={memb.id}>
              <List.Item>
                <Card className="glass-card" hoverable>
                  <Card.Meta
                    avatar={<Avatar src={memb.photoURL} />}
                    title={memb.displayName}
                    description={memb.pronouns}
                  />
                </Card>
              </List.Item>
            </motion.div>
          )}
        />
      </motion.div>
    </Card>
  );
}
