import React, { useState, useEffect, useRef } from "react";

interface TypewriterProps {
  text: string;
  speed?: number; // characters to append per tick
  delay?: number; // millisecond delay between ticks
  children: (typedText: string) => React.ReactNode;
}

export default function Typewriter({ text, speed = 12, delay = 12, children }: TypewriterProps) {
  const [typedText, setTypedText] = useState("");
  const textRef = useRef(text);
  
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    // Reset and start typing animation
    let currentLength = 0;
    setTypedText("");
    
    const interval = setInterval(() => {
      currentLength += speed;
      if (currentLength >= textRef.current.length) {
        setTypedText(textRef.current);
        clearInterval(interval);
      } else {
        setTypedText(textRef.current.slice(0, currentLength));
      }
    }, delay);

    return () => clearInterval(interval);
  }, [text, speed, delay]);

  return <>{children(typedText)}</>;
}
