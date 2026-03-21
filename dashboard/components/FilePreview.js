'use client';

function formatSize(bytes) {

  if (!bytes) return '';

  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1) return mb.toFixed(2) + " MB";

  return kb.toFixed(1) + " KB";
}

function getIcon(name = '') {

  const ext = name.split('.').pop().toLowerCase();

  const map = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📑",
    pptx: "📑",
    zip: "🗜️",
    txt: "📄",
    mp3: "🎵",
    mp4: "🎬",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️"
  };

  return map[ext] || "📎";
}

export default function FilePreview({ url, name, size }) {

  if (!url) return null;

  const icon = getIcon(name);

  return (

    <a
      href={url}
      target="_blank"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        textDecoration: "none",
        color: "white"
      }}
    >

      <div style={{ fontSize: 22 }}>
        {icon}
      </div>

      <div>

        <div style={{ fontSize: 14 }}>
          {name}
        </div>

        <div style={{
          fontSize: 12,
          opacity: .6
        }}>
          {formatSize(size)}
        </div>

      </div>

    </a>

  );

}