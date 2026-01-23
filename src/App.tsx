import './App.css';
import { StoryGraph } from './components/StoryGraph';

function App() {
  return (
    <div className="App">
      <header className="story-header">
        <h1 className="story-title">Kindling</h1>
        <p className="story-subtitle">One soul at a time</p>
      </header>
      <main className="story-main">
        <StoryGraph />
      </main>
    </div>
  );
}

export default App;
