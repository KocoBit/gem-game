import { useEffect, useState } from 'react';

/** Center overlay for combo / level-up / shuffle messages (shown ~0.9s). */
export default function Message({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message.text) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(t);
  }, [message.id, message.text]);

  return <div className={`msg${visible ? ' show' : ''}`}>{message.text}</div>;
}
