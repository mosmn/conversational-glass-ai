# 🎤 Voice Input Integration Guide

## Overview

Your Conversational Glass AI now includes ultra-fast voice input functionality powered by Groq's Whisper models. Users can simply speak and have their speech converted to text instantly for chat interactions.

## ✨ Features

- **⚡ Ultra-Fast Transcription**: Powered by Groq's Whisper Large V3 Turbo model
- **🎯 High Accuracy**: Advanced speech recognition with noise cancellation
- **🌐 Multi-Language Support**: Supports multiple languages (configurable)
- **🔒 Privacy-First**: Server-side processing with secure API endpoints
- **📱 Cross-Platform**: Works on desktop and mobile browsers
- **🎨 Beautiful UI**: Integrated glassmorphic design with visual feedback

## 🚀 Quick Start

### 1. Environment Setup

Ensure your Groq API key is configured:

```bash
# .env.local
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 2. Browser Support

The voice input feature requires:
- **Microphone access** (user will be prompted)
- **Modern browser** with MediaRecorder API support
- **HTTPS connection** (required for microphone access)

### 3. Usage in Chat

1. **Click the microphone button** in the chat input area
2. **Grant microphone permission** when prompted
3. **Start speaking** naturally
4. **Click the button again** or wait for silence to stop recording
5. **Text appears automatically** in the input field

## 🛠 Implementation Details

### Components

#### `useVoiceInput` Hook
```typescript
const {
  isRecording,
  isTranscribing,
  formattedDuration,
  isSupported,
  toggleRecording,
  error,
} = useVoiceInput({
  onTranscription: (text: string) => {
    // Handle transcribed text
  },
  onError: (error: string) => {
    // Handle errors
  },
  language: "en", // Optional: specify language
});
```

#### `VoiceInputButton` Component
```jsx
<VoiceInputButton
  onTranscription={handleTranscription}
  language="en"
  size="lg"
  variant="default"
/>
```

### API Endpoint

**POST** `/api/voice/transcribe`

**Request:**
- `audio`: Audio file (WebM, WAV, MP3, etc.)
- `model`: Whisper model (optional, defaults to "whisper-large-v3-turbo")
- `language`: Language code (optional, defaults to "en")
- `prompt`: Context prompt (optional)

**Response:**
```json
{
  "success": true,
  "text": "Transcribed speech text",
  "duration": 1234,
  "metadata": {
    "model": "whisper-large-v3-turbo",
    "language": "en",
    "audioSize": 45678,
    "audioType": "audio/webm"
  }
}
```

## 🎯 Integration Examples

### Basic Chat Integration

```typescript
// In ChatInput component
const { toast } = useToast();

const {
  isRecording,
  isTranscribing,
  toggleRecording,
} = useVoiceInput({
  onTranscription: (text: string) => {
    // Append to existing input
    const newValue = inputValue ? `${inputValue} ${text}` : text;
    onInputChange(newValue);
    
    toast({
      title: "Voice transcribed",
      description: "Speech converted to text successfully.",
    });
  },
  onError: (error: string) => {
    toast({
      title: "Voice input failed",
      description: error,
      variant: "destructive",
    });
  },
});
```

### Standalone Voice Component

```jsx
function VoiceDemo() {
  const [transcription, setTranscription] = useState("");
  
  return (
    <div>
      <VoiceInputButton
        onTranscription={setTranscription}
        size="lg"
      />
      <p>{transcription}</p>
    </div>
  );
}
```

## 🔧 Configuration

### Whisper Model Options

- `whisper-large-v3-turbo` (default): Fastest, good accuracy
- `whisper-large-v3`: Best accuracy, slower
- `distil-whisper-large-v3-en`: English-only, very fast

### Language Support

Common language codes:
- `en`: English
- `es`: Spanish
- `fr`: French
- `de`: German
- `zh`: Chinese
- `ja`: Japanese

### Audio Settings

The system automatically configures optimal audio settings:
- Sample rate: 16kHz (optimal for Whisper)
- Echo cancellation: Enabled
- Noise suppression: Enabled
- Format: WebM with Opus codec

## 🎨 UI States

The voice input button shows different states:

- **🎤 Ready**: Gray microphone icon
- **🔴 Recording**: Red stop icon with pulse animation
- **🔵 Transcribing**: Blue spinning loader
- **❌ Unsupported**: Disabled state

## 📱 Mobile Considerations

- **iOS Safari**: Requires user gesture to start recording
- **Android Chrome**: Works seamlessly
- **PWA**: Install as app for better microphone access
- **Background**: Recording stops when app goes to background

## 🔒 Privacy & Security

- **No audio storage**: Audio is processed and immediately discarded
- **Secure transmission**: All data sent over HTTPS
- **User consent**: Microphone permission required
- **Error handling**: Graceful fallbacks for permission denied

## 🐛 Troubleshooting

### Common Issues

**"Voice input not supported"**
- Ensure you're using HTTPS
- Try a modern browser (Chrome, Firefox, Safari)
- Check if microphone is available

**"Permission denied"**
- Grant microphone permission in browser settings
- Reload the page and try again
- Check for browser security restrictions

**"No speech detected"**
- Speak louder and clearer
- Check microphone is working
- Try shorter recordings initially

**"Transcription failed"**
- Check Groq API key is valid
- Verify API quota isn't exceeded
- Try again with better audio quality

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('voice-debug', 'true');
```

## 🚀 Demo

Try the voice input feature:
1. Visit `/demo/voice` for a full demo page
2. Test different features and settings
3. See transcription history and accuracy

## 🔮 Future Enhancements

Planned features:
- **Real-time transcription**: Stream transcription as you speak
- **Voice commands**: "Send message", "Clear text", etc.
- **Speaker identification**: Multiple speaker detection
- **Custom vocabulary**: Improve accuracy for specific terms
- **Voice shortcuts**: Quick actions via voice

---

**🎉 Ready to talk to your AI? Click the microphone and start the conversation!** 