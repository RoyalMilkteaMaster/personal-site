'use client';
import StarlitExperience from '@/components/starlit-experience';
import { mountBrandScene } from '../starlit-sky-study/scene-study.mjs';
export default function FullPreview() { return <StarlitExperience mountScene={mountBrandScene} study />; }
