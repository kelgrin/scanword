import React, { useRef, useState, useEffect } from 'react';

interface DraggableGridProps {
  children: React.ReactNode;
}

const DraggableGrid: React.FC<DraggableGridProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-auto cursor-grab active:cursor-grabbing select-none border border-gray-200 dark:border-gray-700 rounded-lg"
      style={{ 
        width: '100%',
        height: 'calc(100vh - 200px)',
        minHeight: '400px'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-4 min-w-fit min-h-fit">
        {children}
      </div>
    </div>
  );
};

export default DraggableGrid;
