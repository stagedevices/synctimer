import { useEffect, useState, useCallback } from 'react';
import { Card, Input, List, Button, Tag as AntTag, Spin } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, orderBy, limit, startAfter, where, doc, getDoc, setDoc, writeBatch, increment, type DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import { toast } from '../lib/toast';

interface TagInfo {
  id: string;
  name: string;
  type?: string;
  memberCount?: number;
  /** Whether the current user is a member */
  isMember?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [val, setVal] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setVal(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return val;
}

export function Explore() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [searchResults, setSearchResults] = useState<TagInfo[]>([]);

  const [yourTags, setYourTags] = useState<TagInfo[]>([]);
  const [trending, setTrending] = useState<TagInfo[]>([]);
  const [featured, setFeatured] = useState<TagInfo[]>([]);

  const [trendCursor, setTrendCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [featCursor, setFeatCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [trendMore, setTrendMore] = useState(true);
  const [featMore, setFeatMore] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingFeat, setLoadingFeat] = useState(false);

  const joinTag = useCallback(async (id: string) => {
    if (!uid) return;
    const lower = id.toLowerCase();
    try {
      const tagRef = doc(db, 'tags', lower);
      // ensure tag exists
      await setDoc(tagRef, { name: lower }, { merge: true });
      const membersRef = collection(tagRef, 'members');
      const batch = writeBatch(db);
      // add current user to members
      batch.set(doc(membersRef, uid), {});
      // increment member count
      batch.update(tagRef, { memberCount: increment(1) });
      // track tag on user document
      batch.set(doc(db, 'users', uid, 'tags', lower), { name: lower });
      await batch.commit();
      toast.success(`Joined #${lower}`);
      setYourTags(t =>
        t.some(x => x.id === lower) ? t : [...t, { id: lower, name: lower, isMember: true }],
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [uid]);

  const leaveTag = useCallback(async (id: string) => {
    if (!uid) return;
    try {
      const tagRef = doc(db, 'tags', id);
      const membersRef = collection(tagRef, 'members');
      const batch = writeBatch(db);
      batch.delete(doc(membersRef, uid));
      batch.update(tagRef, { memberCount: increment(-1) });
      batch.delete(doc(db, 'users', uid, 'tags', id));
      await batch.commit();
      toast.success(`Left #${id}`);
      setYourTags(t => t.filter(x => x.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [uid]);

  const loadYourTags = useCallback(async () => {
    if (!uid) return;
    const snap = await getDocs(collection(db, 'users', uid, 'tags'));
    const arr: TagInfo[] = [];
    for (const d of snap.docs) {
      const t = await getDoc(doc(db, 'tags', d.id));
      if (t.exists()) {
        arr.push({ id: d.id, ...(t.data() as Record<string, unknown>), isMember: true } as TagInfo);
      } else {
        arr.push({ id: d.id, name: d.id, isMember: true });
      }
    }
    setYourTags(arr);
  }, [uid]);

  const loadTrending = useCallback(async () => {
    if (loadingTrend || !trendMore) return;
    setLoadingTrend(true);
    let q = query(collection(db, 'tags'), orderBy('memberCount', 'desc'), limit(12));
    if (trendCursor) q = query(q, startAfter(trendCursor));
    const snap = await getDocs(q);
    const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as TagInfo));
    setTrending(t => [...t, ...arr]);
    setTrendCursor(snap.docs[snap.docs.length - 1] || null);
    setTrendMore(snap.size === 12);
    setLoadingTrend(false);
  }, [trendCursor, trendMore, loadingTrend]);

  const loadFeatured = useCallback(async () => {
    if (loadingFeat || !featMore) return;
    setLoadingFeat(true);
    let q = query(collection(db, 'tags'), where('isFeatured', '==', true), orderBy('memberCount', 'desc'), limit(12));
    if (featCursor) q = query(q, startAfter(featCursor));
    const snap = await getDocs(q);
    const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as TagInfo));
    setFeatured(f => [...f, ...arr]);
    setFeatCursor(snap.docs[snap.docs.length - 1] || null);
    setFeatMore(snap.size === 12);
    setLoadingFeat(false);
  }, [featCursor, featMore, loadingFeat]);

  const searchTags = useCallback(async () => {
    if (!debounced) {
      setSearchResults([]);
      return;
    }
    const term = debounced.toLowerCase();
    const q = query(
      collection(db, 'tags'),
      orderBy('name'),
      startAfter(term),
      limit(5)
    );
    const snap = await getDocs(q);
    const arr: TagInfo[] = [];
    for (const d of snap.docs.filter(doc => doc.id.startsWith(term))) {
      let isMember = false;
      if (uid) {
        const memDoc = await getDoc(doc(db, 'tags', d.id, 'members', uid));
        isMember = memDoc.exists();
      }
      arr.push({ id: d.id, ...(d.data() as Record<string, unknown>), isMember } as TagInfo);
    }
    setSearchResults(arr);
  }, [debounced, uid]);

  useEffect(() => { loadYourTags(); }, [loadYourTags]);
  useEffect(() => { loadTrending(); }, [loadTrending]);
  useEffect(() => { loadFeatured(); }, [loadFeatured]);
  useEffect(() => { searchTags(); }, [searchTags]);

  if (!uid) return <Spin />;

  const renderTag = (tag: TagInfo) => {
    const joined = yourTags.some(t => t.id === tag.id);
    return (
      <motion.div variants={cardVariants(reduce)} key={tag.id}>
        <Card
          className="glass-card"
          hoverable
          onClick={() => navigate(`/explore/${tag.id}`)}
          actions={[
            <Button
              key="join"
              type={joined ? 'default' : 'primary'}
              onClick={e => {
                e.stopPropagation();
                if (joined) {
                  leaveTag(tag.id);
                } else {
                  joinTag(tag.id);
                }
              }}
            >
              {joined ? 'Leave' : 'Join'}
            </Button>,
          ]}
        >
          <Card.Meta
            title={`#${tag.name}`}
            description={
              <span>
                <AntTag style={{ marginRight: 8 }}>{tag.type || 'tag'}</AntTag>
                {tag.memberCount ?? 0} members
              </span>
            }
          />
        </Card>
      </motion.div>
    );
  };

  return (
    <Card title="Explore" className="glass-card" style={{ margin: '2rem' }}>
      <Input
        placeholder="Search tags"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onPressEnter={() => {
          if (searchResults[0]) navigate(`/explore/${searchResults[0].id}`);
        }}
        style={{ marginBottom: 16 }}
      />
      {search && searchResults.length > 0 && (
        <List
          bordered
          style={{ marginBottom: 16 }}
          dataSource={searchResults}
          renderItem={t => {
            const joined = yourTags.some(y => y.id === t.id);
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                actions={[
                  joined ? (
                    <span key="joined" aria-label="joined">✓ Joined</span>
                  ) : (
                    <Button
                      key="join"
                      type="link"
                      onClick={e => {
                        e.stopPropagation();
                        joinTag(t.id);
                      }}
                    >
                      + Join
                    </Button>
                  ),
                ]}
                onClick={() => navigate(`/explore/${t.id}`)}
              >
                #{t.name}
              </List.Item>
            );
          }}
        />
      )}
      <h3>Your Tags</h3>
      <motion.div variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }} initial="show" animate="show">
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={yourTags}
          renderItem={t => <List.Item>{renderTag(t)}</List.Item>}
        />
      </motion.div>
      <h3>Trending Tags</h3>
      <motion.div variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }} initial="show" animate="show">
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={trending}
          renderItem={t => <List.Item>{renderTag(t)}</List.Item>}
        />
        {trendMore && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button onClick={loadTrending} loading={loadingTrend}>Load more</Button>
          </div>
        )}
      </motion.div>
      <h3>Featured Tags</h3>
      <motion.div variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }} initial="show" animate="show">
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={featured}
          renderItem={t => <List.Item>{renderTag(t)}</List.Item>}
        />
        {featMore && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button onClick={loadFeatured} loading={loadingFeat}>Load more</Button>
          </div>
        )}
      </motion.div>
    </Card>
  );
}
