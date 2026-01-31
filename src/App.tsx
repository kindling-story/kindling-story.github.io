import { useState } from 'react';
import './App.css';
import { StoryGraph } from './components/StoryGraph';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllNodes, setShowAllNodes] = useState(false);

  return (
    <div className="App">
      <header className="story-header">
        <h1 className="story-title">Kindling</h1>
        <p className="story-subtitle">One soul at a time</p>
        
        <div className="tools-menu">
          <button 
            className="tools-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Tools menu"
          >
            ⚙
          </button>
          
          {menuOpen && (
            <div className="tools-dropdown">
              <label className="tools-option">
                <input
                  type="checkbox"
                  checked={showAllNodes}
                  onChange={(e) => setShowAllNodes(e.target.checked)}
                />
                <span>Show All Nodes (Dev)</span>
              </label>
            </div>
          )}
        </div>
      </header>
      <main className="story-main">
        <StoryGraph showAllNodes={showAllNodes} />
      </main>
    </div>
  );
}

export default App;
