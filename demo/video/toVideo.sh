code-movie -p project.json5 |
  ffmpeg -y -r 60 -f image2pipe -s 800x450 -vcodec png -i - -vcodec libx264 -pix_fmt yuv420p -vsync cfr -f ismv -movflags +faststart video.mp4
