import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type DocType = 'README.md' | 'FUNCTIONAL_MANUAL.md' | 'TECHNICAL_MANUAL.md' | 'CHANGELOG.md';

const DOCS: { id: DocType; title: string }[] = [
  { id: 'README.md', title: 'README' },
  { id: 'FUNCTIONAL_MANUAL.md', title: 'Functional Manual' },
  { id: 'TECHNICAL_MANUAL.md', title: 'Technical Manual' },
  { id: 'CHANGELOG.md', title: 'Version Log' },
];

const InfoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocType>('README.md');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      try {
        const docContent = await window.electronAPI?.getDoc(activeTab);
        if (docContent) {
          setContent(docContent);
        } else {
          throw new Error("Electron API is not available to load documentation.");
        }
      } catch (error) {
        console.error(`Failed to load content for ${activeTab}:`, error);
        setContent(`# Error\n\nCould not load documentation file.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoc();
  }, [activeTab]);
  
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({node, ...props}: any) => {
      if (props.href && (props.href.startsWith('http') || props.href.startsWith('https'))) {
        return <a {...props} onClick={(e) => {
          e.preventDefault();
          window.electronAPI?.openWeblink(props.href);
        }} />;
      }
      return <a {...props} />;
    }
  }), []);

  const memoizedMarkdown = useMemo(() => (
    <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
    />
  ), [content, markdownComponents]);

  return (
    <div className="w-full mx-auto animate-fade-in" data-automation-id="info-view">
        <div className="sticky top-0 z-10 flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
            {DOCS.map(doc => (
                <button
                    key={doc.id}
                    onClick={() => setActiveTab(doc.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                        activeTab === doc.id
                        ? 'border-b-2 border-cyan-500 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                    data-automation-id={`info-tab-${doc.id}`}
                >
                    {doc.title}
                </button>
            ))}
        </div>
        <div className="p-6 sm:p-8">
            {isLoading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading document...</div>
            ) : (
                <article className="prose prose-gray dark:prose-invert max-w-none">
                    {memoizedMarkdown}
                </article>
            )}
        </div>
    </div>
  );
};

export default InfoView;