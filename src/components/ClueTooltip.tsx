import React, { useEffect, useState, useRef } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';

interface ClueTooltipProps {
  text: string;
  wordText: string;
  onClose: () => void;
  x: number;
  y: number;
}

const ClueTooltip: React.FC<ClueTooltipProps> = ({ text, wordText, onClose }) => {
  const [webInfo, setWebInfo] = useState<{ source: string; text: string }[]>([]);
  const [animeImage, setAnimeImage] = useState<string | null>(null);
  const [showAnimeMode, setShowAnimeMode] = useState(() => {
    return localStorage.getItem('showAnimeMode') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!showAnimeMode) return;
    
    const fetchAnimeImage = async () => {
      try {
        const timestamp = Date.now();
        
        const apis = [
          `https://api.waifu.pics/sfw/waifu?timestamp=${timestamp}`,
          `https://nekos.life/api/v2/img/neko?timestamp=${timestamp}`,
          `https://api.waifu.im/search?included_tags=waifu&many=false&timestamp=${timestamp}`
        ];
        
        for (const api of apis) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(api, { 
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              continue;
            }
            
            const data = await response.json();
            const imageUrl = data.url || data.image;
            
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
              setAnimeImage(imageUrl);
              return;
            }
          } catch (error) {
            continue;
          }
        }
        
        console.warn('All anime image APIs failed, using placeholder');
      } catch (error) {
        console.error('Failed to fetch anime image:', error);
      }
    };

    fetchAnimeImage();
  }, [showAnimeMode, wordText]);

  useEffect(() => {
    localStorage.setItem('showAnimeMode', showAnimeMode.toString());
  }, [showAnimeMode]);

  useEffect(() => {
    const fetchWebInfo = async () => {
      if (!wordText || wordText.length < 2) return;
      
      setLoading(true);
      
      const results: { source: string; text: string }[] = [];
      
      const sources = [
        {
          name: 'Wikipedia',
          fetch: async () => {
            const query = wordText;
            const response = await fetch(
              `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`
            );
            const data = await response.json();
            
            if (data.query?.search?.length > 0) {
              const title = data.query.search[0].title;
              const summaryResponse = await fetch(
                `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
              );
              const summaryData = await summaryResponse.json();
              
              if (summaryData.extract) {
                const sentences = summaryData.extract.match(/[^.!?]+[.!?]+/g) || [summaryData.extract];
                return sentences.slice(0, 2).join(' ').trim();
              }
            }
            return null;
          }
        },
        
        {
          name: 'DuckDuckGo',
          fetch: async () => {
            const response = await fetch(
              `https://api.duckduckgo.com/?q=${encodeURIComponent(wordText)}&format=json&no_html=1&skip_disambig=1`
            );
            const data = await response.json();
            
            if (data.AbstractText) {
              const sentences = data.AbstractText.match(/[^.!?]+[.!?]+/g) || [data.AbstractText];
              return sentences.slice(0, 2).join(' ').trim();
            }
            return null;
          }
        },
        
        {
          name: 'Dictionary',
          fetch: async () => {
            const response = await fetch(
              `https://api.dictionaryapi.dev/api/v2/entries/ru/${encodeURIComponent(wordText.toLowerCase())}`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
                const definitions = data[0].meanings[0].definitions;
                if (definitions && definitions.length > 0) {
                  return definitions[0].definition;
                }
              }
            }
            return null;
          }
        }
      ];
      
      const firstTwoSources = sources.slice(0, 2);
      const promises = firstTwoSources.map(async (source) => {
        try {
          const text = await source.fetch();
          if (text) {
            results.push({ source: source.name, text });
          }
        } catch (error) {
          console.warn(`${source.name} failed:`, error);
        }
      });
      
      await Promise.all(promises);
      
      if (results.length > 0) {
        setWebInfo(results);
        setLoading(false);
        return;
      }
      
      try {
        const backupText = await sources[2].fetch();
        if (backupText) {
          setWebInfo([{ source: sources[2].name, text: backupText }]);
        } else {
          setWebInfo([]);
        }
      } catch (error) {
        console.warn('Backup source failed:', error);
        setWebInfo([]);
      }
      
      setLoading(false);
    };

    fetchWebInfo();
  }, [wordText]);

  useEffect(() => {
    const parentCell = tooltipRef.current?.parentElement;
    if (parentCell) {
      const cellRect = parentCell.getBoundingClientRect();
      const tooltipWidth = 260;
      const tooltipHeight = 150;
      
      let top = cellRect.top - tooltipHeight - 12;
      let left = cellRect.left + cellRect.width / 2 - tooltipWidth / 2;
      
      if (top < 8) {
        top = cellRect.bottom + 12;
      }
      
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      
      if (left < 8) {
        left = 8;
      }
      
      setPosition({ top, left });
    }
  }, []);

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div
        ref={tooltipRef}
        className={`fixed z-[9999] transition-all duration-300 ${isExpanded ? 'animate-fade-in' : 'animate-fade-in'}`}
        style={
          isExpanded 
            ? { 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                width: '75vw', 
                maxWidth: '90vw',
                maxHeight: '90vh'
              } 
            : position 
              ? { top: position.top, left: position.left, minWidth: '220px', maxWidth: '300px' } 
              : { visibility: 'hidden' }
        }
        onClick={(e) => e.stopPropagation()}
      >
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 relative transition-colors ${isExpanded ? 'overflow-y-auto max-h-[90vh]' : ''}`}>
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={() => setShowAnimeMode(!showAnimeMode)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={showAnimeMode ? 'Показать описание' : 'Показать аниме картинку'}
          >
            {showAnimeMode ? (
              <Globe size={14} className="text-blue-500" />
            ) : (
              <span className="text-xs">🎨</span>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="pr-12">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">{text}</p>
          
          {wordText && (
            <p className="text-xs text-green-600 dark:text-green-400 font-bold mb-2">
              Ответ: {wordText}
            </p>
          )}
          
          {showAnimeMode ? (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
              {animeImage ? (
                <div 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`rounded-lg cursor-pointer transition-all duration-300 ${
                    isExpanded ? 'flex items-center justify-center' : ''
                  }`}
                  title={isExpanded ? 'Нажмите, чтобы уменьшить' : 'Нажмите, чтобы увеличить'}
                >
                  <img 
                    src={animeImage} 
                    alt="Anime girl" 
                    className={`rounded-lg transition-all duration-300 ${
                      isExpanded 
                        ? 'max-w-full max-h-[80vh] w-auto h-auto object-contain' 
                        : 'w-full max-h-48 object-cover hover:opacity-90'
                    }`}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Загрузка картинки...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {loading && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Загрузка информации...</span>
                </div>
              )}
              
              {webInfo.length > 0 && !loading && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {webInfo.map((info, index) => (
                      <div key={index}>
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                          <Globe size={10} />
                          <span className="font-medium">{info.source}:</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{info.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {webInfo.length === 0 && !loading && wordText && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Информация недоступна</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {!isExpanded && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white',
          }}
        />
      )}
      </div>
    </>
  );
};

export default ClueTooltip;
