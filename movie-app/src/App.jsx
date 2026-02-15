import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
import Room from './pages/Room';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import Search from './pages/Search';
import Category from './pages/Category';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import ScrollToTop from './components/common/ScrollToTop';


console.log('App.jsx is loading...');

function App() {
  console.log('App component rendering...');
  
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:slug" element={<MovieDetail />} />
        <Route path="/watch/:slug" element={<Watch />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/history" element={<History />} />
        <Route path="/search" element={<Search />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/country/:slug" element={<Category type="country" />} />
        <Route path="/year/:slug" element={<Category type="year" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ScrollToTop />
      <Footer />
    </>
  );
}

export default App;
