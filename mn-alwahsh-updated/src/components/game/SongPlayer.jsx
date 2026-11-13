// "Guess the song" player — plays a short clip through YouTube's own embedded
// player (no audio files are hosted by us). YouTube's terms require the player
// to stay visible and at least 200x200, so it is shown, not hidden; ads may
// play before the clip on monetized videos.
export default function SongPlayer({ videoId, start = 0, duration = 12 }) {
  if (!videoId) return null;
  const end = start + duration;
  const src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    `?start=${start}&end=${end}&playsinline=1&rel=0&modestbranding=1&fs=0&iv_load_policy=3&disablekb=1`;
  return (
    <div style={{ width:'100%', maxWidth:320, aspectRatio:'16 / 10', minHeight:200,
      marginBottom:10, borderRadius:12, overflow:'hidden', background:'#000', flexShrink:0 }}>
      <iframe
        title="song-clip"
        src={src}
        width="100%" height="100%"
        style={{ border:0, display:'block' }}
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
