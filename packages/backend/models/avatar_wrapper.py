def generate_video(audio_path, avatar_id, output_path):
    import cv2
    import numpy as np
    from moviepy.editor import AudioFileClip, VideoFileClip
    import os
    
    avatar_dir = f"./assets/avatars/{avatar_id}.png"
    
    if not os.path.exists(avatar_dir):
        print(f"Avatar not found: {avatar_dir}")
        return False
    
    try:
        audio = AudioFileClip(audio_path)
        duration = audio.duration
        
        avatar = cv2.imread(avatar_dir)
        avatar = cv2.resize(avatar, (512, 512))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, 30.0, (512, 512))
        
        for i in range(int(duration * 30)):
            out.write(avatar)
        
        out.release()
        
        video = VideoFileClip(output_path)
        video = video.set_audio(audio)
        video.write_videofile(output_path, codec='libx264')
        
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False