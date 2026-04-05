'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

export interface Project {
  id: string;
  name: string;
  city: string;
  type: string;
  year: string;
  image: string;
}

function KineticCard({ project, scrollVelocity }: { project: Project; scrollVelocity: any }) {
  const smoothVelocity = useSpring(scrollVelocity, {
    mass: 0.1,
    stiffness: 80,
    damping: 40,
  });
  const skew = useTransform(smoothVelocity, [-1500, 0, 1500], [-4, 0, 4]);

  return (
    <motion.div
      className="relative overflow-hidden group cursor-pointer"
      style={{ skewX: skew }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#121212]">
        <motion.img
          src={project.image}
          alt={project.name}
          className="w-full h-full object-cover"
          style={{ transform: 'scale(1.12)' }}
          whileHover={{ scale: 1.0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
        {/* Gold top border trace on hover */}
        <div className="absolute top-0 left-0 h-[2px] w-0 bg-[#D4AF37] group-hover:w-full transition-all duration-500 ease-out" />
      </div>
      {/* Card metadata */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-[#A08928] text-[10px] font-semibold tracking-[0.3em] uppercase mb-1">
          {project.type}  {project.year}
        </p>
        <h3 className="text-[#F5F0E8] text-lg font-bold leading-tight">{project.name}</h3>
        <p className="text-[#F5F0E8]/50 text-xs tracking-widest uppercase mt-0.5">{project.city}</p>
      </div>
    </motion.div>
  );
}

interface Props {
  projects: Project[];
  preview?: boolean;
}

export default function KineticGallery({ projects, preview = false }: Props) {
  const { scrollYProgress } = useScroll();
  const scrollYVelocity = useTransform(
    scrollYProgress,
    [0, 1],
    [0, 1000],
    { clamp: false }
  );

  const displayProjects = preview ? projects.slice(0, 3) : projects;
  const cols = preview ? 3 : 3;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-px bg-[#D4AF37]/10 overflow-hidden`}>
      {displayProjects.map((project) => (
        <div key={project.id} className="bg-[#080808]">
          <KineticCard project={project} scrollVelocity={scrollYVelocity} />
        </div>
      ))}
    </div>
  );
}
