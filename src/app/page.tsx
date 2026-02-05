import styles from "./page.module.css";
import ChatPanel from "@/components/ChatPanel/ChatPanel";
import Avatar3D from "@/components/Avatar3D/Avatar3D";
import { LipSyncProvider } from "@/components/Avatar3D/lipsync";
export default function Home() {
  return (
    <LipSyncProvider>
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <ChatPanel />
      </div>
      <div className={styles.rightPanel}>
        
          <Avatar3D />
       
      </div>
    </div>
     </LipSyncProvider>
  );
}
