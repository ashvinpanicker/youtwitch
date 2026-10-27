import { LazyMotion, MotionConfig } from 'motion/react';
import StreamViewer from './components/StreamViewer';

const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default);

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <StreamViewer />
      </LazyMotion>
    </MotionConfig>
  );
}

export default App;
