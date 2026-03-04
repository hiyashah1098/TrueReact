declare module 'expo-av' {
  export namespace Audio {
    interface RecordingOptions {
      isMeteringEnabled?: boolean;
      android: {
        extension: string;
        outputFormat: number;
        audioEncoder: number;
        sampleRate: number;
        numberOfChannels: number;
        bitRate: number;
      };
      ios: {
        extension: string;
        outputFormat: number;
        audioQuality: number;
        sampleRate: number;
        numberOfChannels: number;
        bitRate: number;
        linearPCMBitDepth?: number;
        linearPCMIsBigEndian?: boolean;
        linearPCMIsFloat?: boolean;
      };
      web?: Record<string, unknown>;
    }

    interface RecordingStatus {
      canRecord: boolean;
      isRecording: boolean;
      isDoneRecording: boolean;
      durationMillis: number;
      metering?: number;
      uri?: string | null;
    }

    class Recording {
      prepareToRecordAsync(options: RecordingOptions): Promise<RecordingStatus>;
      startAsync(): Promise<RecordingStatus>;
      stopAndUnloadAsync(): Promise<RecordingStatus>;
      pauseAsync(): Promise<RecordingStatus>;
      getStatusAsync(): Promise<RecordingStatus>;
      getURI(): string | null;
      setOnRecordingStatusUpdate(callback: (status: RecordingStatus) => void): void;
    }

    function setAudioModeAsync(mode: {
      allowsRecordingIOS?: boolean;
      playsInSilentModeIOS?: boolean;
      staysActiveInBackground?: boolean;
      interruptionModeIOS?: number;
      shouldDuckAndroid?: boolean;
      interruptionModeAndroid?: number;
      playThroughEarpieceAndroid?: boolean;
    }): Promise<void>;

    function requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;

    const AndroidOutputFormat: {
      MPEG_4: number;
      AAC_ADTS: number;
      AMR_NB: number;
      AMR_WB: number;
      THREE_GPP: number;
      WEBM: number;
      DEFAULT: number;
    };

    const AndroidAudioEncoder: {
      AAC: number;
      AAC_ELD: number;
      AMR_NB: number;
      AMR_WB: number;
      DEFAULT: number;
      HE_AAC: number;
      VORBIS: number;
    };

    const IOSOutputFormat: {
      LINEARPCM: number;
      AC3: number;
      '60958AC3': number;
      APPLEIMA4: number;
      MPEG4AAC: number;
      MPEG4CELP: number;
      MPEG4HVXC: number;
      MPEG4TWINVQ: number;
      MACE3: number;
      MACE6: number;
      ULAW: number;
      ALAW: number;
      QDESIGN: number;
      QDESIGN2: number;
      QUALCOMM: number;
      MPEGLAYER1: number;
      MPEGLAYER2: number;
      MPEGLAYER3: number;
      APPLELOSSLESS: number;
    };

    const IOSAudioQuality: {
      MIN: number;
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      MAX: number;
    };
  }
}
