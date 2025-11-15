/**
 * Check FFmpeg Installation
 * 
 * Run with: node check-ffmpeg.js
 */

const { spawn } = require('child_process');

console.log('🔍 Checking FFmpeg installation...\n');

// Check FFmpeg
const ffmpeg = spawn('ffmpeg', ['-version']);

let ffmpegOutput = '';

ffmpeg.stdout.on('data', (data) => {
  ffmpegOutput += data.toString();
});

ffmpeg.stderr.on('data', (data) => {
  ffmpegOutput += data.toString();
});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    const versionMatch = ffmpegOutput.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    console.log('✅ FFmpeg is installed');
    console.log(`   Version: ${version}`);
    
    // Check for required codecs
    const hasH264 = ffmpegOutput.includes('libx264') || ffmpegOutput.includes('--enable-libx264');
    const hasAAC = ffmpegOutput.includes('aac') || ffmpegOutput.includes('--enable-libfdk-aac') || ffmpegOutput.includes('--enable-encoder=aac');
    
    console.log(`   H.264 codec: ${hasH264 ? '✅' : '❌'}`);
    console.log(`   AAC codec: ${hasAAC ? '✅' : '❌'}`);
    
    if (hasH264 && hasAAC) {
      console.log('\n🎉 FFmpeg is properly configured for YouTube Shorts processing!');
    } else {
      console.log('\n⚠️  FFmpeg is missing required codecs. Please reinstall FFmpeg with full codec support.');
    }
  } else {
    console.log('❌ FFmpeg is not installed or not in PATH');
    console.log('\n📦 Installation instructions:');
    console.log('   macOS:    brew install ffmpeg');
    console.log('   Ubuntu:   sudo apt-get install ffmpeg');
    console.log('   Windows:  Download from https://ffmpeg.org/download.html');
  }
});

ffmpeg.on('error', (error) => {
  console.log('❌ FFmpeg is not installed or not in PATH');
  console.log(`   Error: ${error.message}`);
  console.log('\n📦 Installation instructions:');
  console.log('   macOS:    brew install ffmpeg');
  console.log('   Ubuntu:   sudo apt-get install ffmpeg');
  console.log('   Windows:  Download from https://ffmpeg.org/download.html');
});

// Check FFprobe
setTimeout(() => {
  console.log('\n🔍 Checking FFprobe installation...\n');
  
  const ffprobe = spawn('ffprobe', ['-version']);
  
  ffprobe.on('close', (code) => {
    if (code === 0) {
      console.log('✅ FFprobe is installed');
    } else {
      console.log('❌ FFprobe is not installed');
    }
  });
  
  ffprobe.on('error', () => {
    console.log('❌ FFprobe is not installed');
  });
}, 1000);
