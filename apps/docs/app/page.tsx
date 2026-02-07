"use client";
import Navbar from '../components/landing/navbar'
import React from 'react'
import AnimatedGradientBackground from '../components/landing/animated-gradient-background';
import GlassCardGrid from '../components/landing/glassgridcard';
import { cards } from '../constant';
import Footer from '../components/landing/footer';

const HomePage = () => {

  return (
    <div>
      <Navbar />
      <div className="h-16" />
      <AnimatedGradientBackground>
        <div className="min-h-screen py-20">
          <div className="text-center mb-10 md:mb-16 px-4">
            <h1 className="text-2xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                transition
              </span>
            </h1>
            <p className="text-base md:text-xl text-gray-700 max-w-2xl mx-auto">
              Discover our powerful features designed to transform your workflow
            </p>
          </div>

          <GlassCardGrid cards={cards} />
        </div>
      </AnimatedGradientBackground>
      <Footer />
    </div >
  );
}



export default HomePage;