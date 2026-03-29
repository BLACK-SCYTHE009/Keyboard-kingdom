"use client";
import React, { useEffect, useRef } from "react";
import { 
    Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, 
    SceneLoader, AnimationGroup, Color4, StandardMaterial, Color3, 
    DirectionalLight, Animation, MeshBuilder, AbstractMesh,
    ParticleSystem, Texture
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

interface BabylonArenaProps {
    enemyName: string | null;
    isAttacking: boolean;
    isHit: boolean;
    character: string;
}

export default function BabylonArena({ enemyName, isAttacking, isHit, character }: BabylonArenaProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    
    // Character Refs
    const heroRootRef = useRef<AbstractMesh | null>(null);
    const heroIdleRef = useRef<AnimationGroup | null>(null);
    const heroRunRef = useRef<AnimationGroup | null>(null);
    
    // Monster Refs
    const monsterRootRef = useRef<AbstractMesh | null>(null);
    const hitFlashMatRef = useRef<StandardMaterial | null>(null);
    const particleSystemRef = useRef<any>(null);

    // Initial Engine Setup
    useEffect(() => {
        if (typeof window === 'undefined' || !canvasRef.current) return;
        
        const engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
        engineRef.current = engine;
        
        const scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 0); 
        sceneRef.current = scene;

        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 12, new Vector3(0, 1.5, 0), scene);
        camera.setTarget(new Vector3(0, 1.5, 0));
        
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.7;
        
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
        dirLight.intensity = 0.8;

        // Particle System Setup
        const ps = new ParticleSystem("particles", 2000, scene);
        ps.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
        ps.emitter = new Vector3(3, 1, 0); 
        ps.minEmitBox = new Vector3(-0.5, 0, -0.5);
        ps.maxEmitBox = new Vector3(0.5, 0, 0.5);
        ps.color1 = new Color4(1, 0.1, 0.1, 1);
        ps.color2 = new Color4(1, 0.5, 0, 1);
        ps.minSize = 0.1;
        ps.maxSize = 0.3;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.5;
        ps.emitRate = 0; // stop by default
        ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        ps.gravity = new Vector3(0, -9.81, 0);
        ps.direction1 = new Vector3(-1, 8, 1);
        ps.direction2 = new Vector3(1, 8, -1);
        ps.minEmitPower = 1;
        ps.maxEmitPower = 3;
        ps.updateSpeed = 0.005;
        ps.start();
        particleSystemRef.current = ps;

        // Load HERO based on selection
        const modelName = character === "heroB" ? "Ybot.glb" : "Xbot.glb";
        SceneLoader.ImportMeshAsync("", "https://models.babylonjs.com/", modelName, scene).then((result) => {
            const root = result.meshes[0];
            root.scaling = new Vector3(2.5, 2.5, 2.5); // Bots are small
            root.position = new Vector3(-3, 0, 0);
            root.rotation = new Vector3(0, Math.PI / 2, 0);
            heroRootRef.current = root;

            result.animationGroups.forEach(ag => {
                ag.stop();
                const name = ag.name.toLowerCase();
                if (name.includes("idle")) heroIdleRef.current = ag;
                if (name.includes("run") || name.includes("walk")) heroRunRef.current = ag;
            });

            if (heroIdleRef.current) heroIdleRef.current.play(true);
            else if (result.animationGroups.length > 0) result.animationGroups[0].play(true);
        });

        engine.runRenderLoop(() => { scene.render(); });
        const resize = () => engine.resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
            engine.dispose();
        };
    }, [character]);

    // Load MONSTER with variety
    useEffect(() => {
        if (!sceneRef.current || !enemyName) return;
        const scene = sceneRef.current;

        if (monsterRootRef.current) monsterRootRef.current.dispose(false, true);

        SceneLoader.ImportMeshAsync("", "https://models.babylonjs.com/Yeti/", "Yeti.gltf", scene).then((result) => {
            const root = result.meshes[0];
            
            // Dynamic Scaling & Positioning
            let scale = 0.04;
            let tint = new Color3(1, 1, 1);
            
            const upperName = enemyName.toUpperCase();
            if (upperName.includes("WARDEN")) { scale = 0.08; tint = new Color3(0, 0.1, 0.4); } // Huge dark blue
            else if (upperName.includes("WITHER")) { scale = 0.07; tint = new Color3(0.1, 0.1, 0.1); }
            else if (upperName.includes("ENDER DRAGON")) { scale = 0.1; tint = new Color3(0.3, 0, 0.5); }
            else if (upperName.includes("ZOMBIE")) { tint = new Color3(0.4, 0.8, 0.4); } // Green
            else if (upperName.includes("BLAZE")) { tint = new Color3(1, 0.7, 0); } // Gold
            else if (upperName.includes("CREEPER")) { scale = 0.035; tint = new Color3(0.1, 0.9, 0.1); } // Small green

            root.scaling = new Vector3(scale, scale, scale);
            root.position = new Vector3(3, 0, 0);
            root.rotation = new Vector3(0, -Math.PI / 2, 0); 
            monsterRootRef.current = root;

            // Apply Tint
            result.meshes.forEach(m => {
                if (m.material) {
                    const mat = m.material as StandardMaterial;
                    if (mat.diffuseColor) mat.diffuseColor = tint;
                }
            });

            // Hit Material
            const hitMat = new StandardMaterial("hitMat", scene);
            hitMat.emissiveColor = new Color3(1, 0, 0);
            hitMat.alpha = 0.7;
            hitFlashMatRef.current = hitMat;

            if (result.animationGroups.length > 0) result.animationGroups[0].play(true);
        });
    }, [enemyName]);

    // Animations
    useEffect(() => {
        if (isAttacking && heroRootRef.current) {
            heroIdleRef.current?.stop();
            heroRunRef.current?.play(false);

            const lungeAnim = new Animation("lunge", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            const keys = [{ frame: 0, value: -3 }, { frame: 10, value: 0 }, { frame: 30, value: -3 }];
            lungeAnim.setKeys(keys);

            heroRootRef.current.animations = [lungeAnim];
            sceneRef.current?.beginAnimation(heroRootRef.current, 0, 30, false, 3.0, () => {
                heroRunRef.current?.stop();
                if (heroIdleRef.current) heroIdleRef.current.play(true);
            });
        }
    }, [isAttacking]);

    useEffect(() => {
        if (isHit && monsterRootRef.current && sceneRef.current) {
            const meshes = monsterRootRef.current.getChildMeshes();
            const originalMats = meshes.map(m => m.material);

            if (hitFlashMatRef.current) meshes.forEach(m => m.material = hitFlashMatRef.current!);

            // Particle burst
            if (particleSystemRef.current) {
                particleSystemRef.current.manualEmitCount = 50;
            }

            const recoilAnim = new Animation("recoil", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            const keys = [{ frame: 0, value: 3 }, { frame: 5, value: 4.5 }, { frame: 20, value: 3 }];
            recoilAnim.setKeys(keys);

            monsterRootRef.current.animations = [recoilAnim];
            sceneRef.current?.beginAnimation(monsterRootRef.current, 0, 20, false, 2.0);

            setTimeout(() => { meshes.forEach((m, idx) => m.material = originalMats[idx]); }, 150);
        }
    }, [isHit]);

    return (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full focus:outline-none pointer-events-none" style={{ zIndex: 10 }} />
    );
}
