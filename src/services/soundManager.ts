import NotificationSound from '../assets/sounds/message-notification.mp3';
import ReactionSound from '../assets/sounds/pop.mp3';
import SuccessSound from '../assets/sounds/success.mp3';

export type SoundType = 'message' | 'reaction' | 'success';

class SoundManager {
  private static instance: SoundManager;
  private audios: Record<SoundType, HTMLAudioElement | null> = {
    message: null,
    reaction: null,
    success: null,
  };
  private lastPlayed: number = 0;
  private readonly THROTTLE_MS = 1500;
  private isUnlocked = false;
  private bc: BroadcastChannel;

  private constructor() {
    this.bc = new BroadcastChannel('smurf_sound_sync');
    this.setupSync();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private setupSync(): void {
    this.bc.onmessage = (event) => {
      if (event.data.type === 'SOUND_PLAYED') {
        this.lastPlayed = event.data.timestamp;
      }
    };
  }

  public async unlock(): Promise<void> {
    if (this.isUnlocked) return;

    try {
      if (!this.audios.message) {
        this.audios.message = new Audio(NotificationSound);
        this.audios.message.load();
      }

      await this.audios.message.play();
      this.audios.message.pause();
      this.audios.message.currentTime = 0;
      
      this.isUnlocked = true;
      console.debug('[SoundManager] Audio unlocked.');
    } catch (err) {
      console.debug('[SoundManager] Automatic unlock failed:', err);
    }
  }

  /** Phát âm thanh thông báo */
  public async play(type: SoundType = 'message', options: { force?: boolean } = {}): Promise<void> {
    const now = Date.now();

    if (!options.force && now - this.lastPlayed < this.THROTTLE_MS) {
      return;
    }

    if (document.visibilityState === 'hidden') {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (now - this.lastPlayed < this.THROTTLE_MS) return; 
    }

    try {
      if (!this.audios[type]) {
        let src;
        switch (type) {
          case 'message': src = NotificationSound; break;
          case 'reaction': src = ReactionSound; break;
          case 'success': src = SuccessSound; break;
          default: src = NotificationSound;
        }
        this.audios[type] = new Audio(src);
      }

      const audio = this.audios[type]!;
      audio.currentTime = 0;
      audio.volume = 1.0;
      
      await audio.play();
      
      this.lastPlayed = Date.now();
      this.bc.postMessage({ type: 'SOUND_PLAYED', timestamp: this.lastPlayed });
    } catch (err) {
      console.warn('[SoundManager] Play failed (Blocked by browser):', err);
    }
  }
}

export const soundManager = SoundManager.getInstance();
