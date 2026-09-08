import React, { useEffect, useState } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';

interface ClueTooltipProps {
  text: string;
  wordText: string;
  onClose: () => void;
  x: number;
  y: number;
}

const ClueTooltip: React.FC<ClueTooltipProps> = ({ text, wordText, onClose, x, y }) => {
  const [webInfo, setWebInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWebInfo = async () => {
      if (!wordText || wordText.length < 2) return;
      
      setLoading(true);
      try {
        // Use Wikipedia API to get a brief description
        const query = wordText;
        const response = await fetch(
          `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`
        );
        const data = await response.json();
        
        if (data.query?.search?.length > 0) {
          const title = data.query.search[0].title;
          // Get the summary
          const summaryResponse = await fetch(
            `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          );
          const summaryData = await summaryResponse.json();
          
          if (summaryData.extract) {
            // Take first sentence
            const firstSentence = summaryData.extract.split('.')[0] + '.';
            setWebInfo(firstSentence);
          }
        }
      } catch (error) {
        console.error('Failed to fetch web info:', error);
        setWebInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWebInfo();
  }, [wordText]);

  return (
    <div
      className="absolute z-50 animate-fade-in"
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '100%',
        marginBottom: '8px',
        minWidth: '220px',
        maxWidth: '300px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 relative">
        <button
          onClick={onClose}
          className="absolute top-1 right-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={14} className="text-gray-500" />
        </button>
        
        <div className="pr-5">
          <p className="text-sm font-medium text-gray-800 mb-1">{text}</p>
          
          {wordText && (
            <p className="text-xs text-green-600 font-bold mb-2">
              Ответ: {wordText}
            </p>
          )}
          
          {loading && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              <span>Загрузка информации...</span>
            </div>
          )}
          
          {webInfo && !loading && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                <Globe size={10} />
                <span className="font-medium">Из Википедии:</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{webInfo}</p>
            </div>
          )}
          
          {!webInfo && !loading && wordText && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="text-xs text-gray-400 italic">Информация недоступна</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0"
        style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white',
        }}
      />
    </div>
  );
};

export default ClueTooltip;
