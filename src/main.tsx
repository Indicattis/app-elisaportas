import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { installChunkReload } from './lib/chunkReload'

installChunkReload();

createRoot(document.getElementById("root")!).render(<App />);
