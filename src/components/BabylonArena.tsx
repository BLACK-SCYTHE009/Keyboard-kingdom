"use client";
import React, { useEffect, useRef } from "react";
import { 
    Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, 
    SceneLoader, AnimationGroup, Color4, StandardMaterial, Color3, 
    DirectionalLight, Animation, MeshBuilder, AbstractMesh,
    ParticleSystem, Texture, GlowLayer, PointLight
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

interface BabylonArenaProps {
    enemyName: string | null;
    isAttacking: boolean;
    isHit: boolean;
    character: string;
    attackKey: number;
    attackDuration: number;
    playerAttackKey: number;
    monsterHitKey: number;
    monsterData?: {
        name: string;
        model?: {
            file: string;
            scale: number;
            tint: { r: number; g: number; b: number };
            intensity: number;
        };
    };
}

export default function BabylonArena({ enemyName, isAttacking, isHit, character, attackKey, attackDuration, playerAttackKey, monsterHitKey, monsterData }: BabylonArenaProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    
    // Character Refs
    const heroRootRef = useRef<AbstractMesh | null>(null);
    const heroIdleRef = useRef<AnimationGroup | null>(null);
    const heroRunRef = useRef<AnimationGroup | null>(null);
    
    // Monster Refs
    const monsterRootRef = useRef<AbstractMesh | null>(null);
    const monsterIdleRef = useRef<AnimationGroup | null>(null);
    const monsterHitRef = useRef<AnimationGroup | null>(null);
    const hitFlashMatRef = useRef<StandardMaterial | null>(null);
    const particleSystemRef = useRef<ParticleSystem | null>(null);
    const auraLightRef = useRef<PointLight | null>(null);
    const glowLayerRef = useRef<GlowLayer | null>(null);

    // Prevent out-of-order animation callbacks from fighting each other.
    const lungeSeqRef = useRef(0);
    const hitSeqRef = useRef(0);

    // Initial Engine Setup
    useEffect(() => {
        if (typeof window === 'undefined' || !canvasRef.current) return;
        
        // Production-ready engine setup
        const engine = new Engine(canvasRef.current, true, { 
            preserveDrawingBuffer: true, 
            stencil: true,
            antialias: true,
            alpha: true,
            adaptToDeviceRatio: true,
            powerPreference: 'high-performance'
        });
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

        // Glow Layer for magical effects
        const glow = new GlowLayer("glow", scene);
        glow.intensity = 0.6;
        glowLayerRef.current = glow;

        // 3D Ground (Necessary for the Aura light to be visible)
        const ground = MeshBuilder.CreatePlane("ground", { size: 50 }, scene);
        ground.rotation.x = Math.PI / 2;
        ground.position.y = -0.01; // Slightly below zero to avoid z-fighting
        const groundMat = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
        groundMat.specularColor = new Color3(0, 0, 0);
        groundMat.alpha = 0.4; // Semi-transparent
        ground.material = groundMat;

        // Monster Aura Light (Underneath)
        const aura = new PointLight("aura", new Vector3(3, 0.5, 0), scene);
        aura.diffuse = new Color3(0.5, 0, 1.0); // Default Purple
        aura.intensity = 0.3;
        aura.range = 8;
        auraLightRef.current = aura;

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

        // Load HERO based on selection - use better default model!
        let modelPath = "/models/heroes/";
        let modelFile = "stella_girl.glb"; // Better looking default hero
        let heroScale = 0.035;

        const lowerChar = character.toLowerCase();
        if (lowerChar.includes("stella")) { 
            modelFile = lowerChar.includes("2") ? "stella_girl_2.glb" : "stella_girl.glb"; 
            heroScale = 0.035; 
        } else if (lowerChar.includes("lara") || lowerChar.includes("tomb")) { 
            modelFile = "tomb_raider_laracroft.glb"; 
            heroScale = 0.04; 
        } else if (lowerChar.includes("female") || lowerChar.includes("realistic")) { 
            // Use better model instead of basic boy
            modelFile = "stella_girl.glb";
            heroScale = 0.035;
        } else if (lowerChar.includes("boy")) {
            // Use better model for boy characters
            modelFile = "stella_girl.glb";
            heroScale = 0.035;
        } else if (character === "heroB") {
            modelPath = "https://models.babylonjs.com/";
            modelFile = "Ybot.glb";
            heroScale = 2.5;
        } else if (character === "heroA") {
            modelPath = "https://models.babylonjs.com/";
            modelFile = "Xbot.glb";
            heroScale = 2.5;
        }

        SceneLoader.ImportMeshAsync("", modelPath, modelFile, scene).then((result) => {
            const root = result.meshes[0];
            root.scaling = new Vector3(heroScale, heroScale, heroScale);
            root.position = new Vector3(-3, 0, 0);
            root.rotation = new Vector3(0, Math.PI / 2, 0);
            heroRootRef.current = root;

            // Enhance hero model - make it look much better!
            result.meshes.forEach(mesh => {
                if (mesh.material) {
                    const mat = mesh.material as any;
                    if (mat.diffuseColor) {
                        // Better colors for handsome hero
                        if (modelFile.includes("stella")) {
                            mat.diffuseColor = new Color3(0.9, 0.7, 1.0); // Bright purple/blue
                            mat.specularColor = new Color3(0.4, 0.4, 0.5);
                            mat.emissiveColor = new Color3(0.1, 0.05, 0.15);
                        } else if (modelFile.includes("tomb_raider")) {
                            mat.diffuseColor = new Color3(0.8, 0.6, 0.4); // Adventure brown
                            mat.specularColor = new Color3(0.3, 0.3, 0.3);
                            mat.emissiveColor = new Color3(0.05, 0.02, 0.01);
                        } else {
                            mat.diffuseColor = new Color3(0.7, 0.8, 0.9); // Cool steel blue
                            mat.specularColor = new Color3(0.5, 0.5, 0.6);
                            mat.emissiveColor = new Color3(0.05, 0.1, 0.2);
                        }
                    }
                    if (mat.metallicF0Factor !== undefined) {
                        mat.metallicF0Factor = 0.3; // More shine for heroic look
                    }
                    if (mat.roughness !== undefined) {
                        mat.roughness = 0.4; // Smoother for better appearance
                    }
                }
            });

            // Add heroic glow that fits Minecraft aesthetic
            const heroLight = new PointLight("heroLight", new Vector3(-3, 2, 0), scene);
            heroLight.diffuse = new Color3(0.8, 0.9, 1.0); // Cool blue light
            heroLight.intensity = 0.4;
            heroLight.range = 3;

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

        // Load MONSTER with Minecraft-style blocky models
        useEffect(() => {
            if (!sceneRef.current || !enemyName) return;
            const scene = sceneRef.current;
    
            if (monsterRootRef.current) monsterRootRef.current.dispose(false, true);
    
            // Use server-provided model data for authentic Minecraft look
            let modelFile = "ender_dragon.glb"; // Default blocky boss
            let scale = 0.15;
            let tint = new Color3(0.5, 0, 0.8);
            let intensity = 0.8;
            
            if (monsterData?.model) {
                modelFile = monsterData.model.file;
                scale = monsterData.model.scale;
                tint = new Color3(monsterData.model.tint.r, monsterData.model.tint.g, monsterData.model.tint.b);
                intensity = monsterData.model.intensity;
            } else {
                // Fallback: Name-based detection for compatibility
                const upperName = enemyName.toUpperCase();
                if (upperName.includes("WITHER STORM")) { 
                    modelFile = "wither_storm.glb"; 
                    scale = 0.4; 
                    tint = new Color3(0.2, 0, 0.4); 
                    intensity = 1.5;
                } 
                else if (upperName.includes("WARDEN")) { 
                    modelFile = "warden.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0, 0, 0.5); 
                    intensity = 0.6;
                }
                else if (upperName.includes("WITHER") && !upperName.includes("STORM")) { 
                    modelFile = "wither_storm.glb"; 
                    scale = 0.12; 
                    tint = new Color3(0.3, 0, 0.3); 
                    intensity = 0.8;
                }
                else if (upperName.includes("ENDER DRAGON")) { 
                    modelFile = "ender_dragon.glb"; 
                    scale = 0.15; 
                    tint = new Color3(0.5, 0, 0.8); 
                    intensity = 0.8;
                }
                else if (upperName.includes("ZOMBIE")) { 
                    modelFile = "skeleton_-_low_tier_enemy.glb"; 
                    scale = 0.03; 
                    tint = new Color3(0.9, 0.9, 0.9); 
                    intensity = 0.4;
                }
                else if (upperName.includes("SKELETON")) { 
                    modelFile = "warden.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0, 0, 0.5); 
                    intensity = 0.6;
                }
                else if (upperName.includes("SLIME")) { 
                    modelFile = "slime_1.glb"; 
                    scale = 15.0; 
                    tint = new Color3(0.4, 1, 0.4); 
                    intensity = 0.3;
                }
                else if (upperName.includes("SPIDER")) { 
                    modelFile = "ender_dragon.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0.8, 0.2, 0.9); 
                    intensity = 0.5;
                }
                else if (upperName.includes("CREEPER")) { 
                    modelFile = "wither_storm.glb"; 
                    scale = 0.02; 
                    tint = new Color3(0.3, 0, 0.3); 
                    intensity = 0.8;
                }
                else if (upperName.includes("PHANTOM") || upperName.includes("BLAZE")) { 
                    modelFile = "ender_dragon.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0.8, 0.2, 0.9); 
                    intensity = 0.5;
                }
                else if (upperName.includes("ENDERMAN") || upperName.includes("WITCH")) { 
                    modelFile = "warden.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0, 0, 0.5); 
                    intensity = 0.6;
                }
                else if (upperName.includes("GHOST")) { 
                    modelFile = "ender_dragon.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0.8, 0.2, 0.9); 
                    intensity = 0.5;
                }
                else if (upperName.includes("KNIGHT") || upperName.includes("DEMON") || upperName.includes("HORROR")) { 
                    modelFile = "ender_dragon.glb"; 
                    scale = 0.08; 
                    tint = new Color3(0.8, 0.2, 0.9); 
                    intensity = 0.5;
                }
            }
    
            SceneLoader.ImportMeshAsync("", "/models/mobs/", modelFile, scene).then((result) => {
                const root = result.meshes[0];
                
                // Adjust position for special models
                const upperName = enemyName.toUpperCase();
                const posZ = upperName.includes("STORM") ? 1 : 0;
                const posY = upperName.includes("STORM") ? 3 : 0;
                root.scaling = new Vector3(scale, scale, scale);
                root.position = new Vector3(3, posY, posZ);
                root.rotation = new Vector3(0, -Math.PI / 2, 0); 
                monsterRootRef.current = root;

                // Sync Aura Color
                if (auraLightRef.current) {
                    auraLightRef.current.diffuse = tint;
                    auraLightRef.current.intensity = intensity;
                }
    
                // Apply Tint & Initial Emissive
                result.meshes.forEach(m => {
                    if (m.material) {
                        const mat = m.material as unknown as {
                            diffuseColor?: Color3;
                            albedoColor?: Color3;
                            emissiveColor?: Color3;
                            emissiveIntensity?: number;
                        };
                        if (mat?.diffuseColor) mat.diffuseColor = tint;
                        if (mat?.albedoColor) mat.albedoColor = tint;
                        
                        // Setup for Glow
                        if (mat?.emissiveColor !== undefined) {
                            mat.emissiveColor = tint;
                            mat.emissiveIntensity = 0.2;
                        }
                    }
                });
    
                // Hit Material
                const hitMat = new StandardMaterial("hitMat", scene);
                hitMat.emissiveColor = new Color3(1, 0, 0);
                hitMat.alpha = 0.7;
                hitFlashMatRef.current = hitMat;
    
                // Select monster animation groups by name heuristics.
                result.animationGroups.forEach(ag => {
                    ag.stop();
                    const name = ag.name.toLowerCase();
                    if (name.includes("idle") || name.includes("stand")) monsterIdleRef.current = ag;
                    if (name.includes("hit") || name.includes("hurt") || name.includes("damage")) monsterHitRef.current = ag;
                });

                // Fallback selections if heuristics didn't match anything.
                if (!monsterIdleRef.current && result.animationGroups.length > 0) {
                    monsterIdleRef.current = result.animationGroups[0];
                }
                if (!monsterHitRef.current && result.animationGroups.length > 1) {
                    monsterHitRef.current = result.animationGroups[1];
                }

                monsterIdleRef.current?.play(true);
            });
        }, [enemyName, monsterData]);

    // Animations
    useEffect(() => {
        if (!sceneRef.current || !heroRootRef.current) return;
        if (playerAttackKey <= 0) return;

            const seq = ++lungeSeqRef.current;
            const scene = sceneRef.current;
            const hero = heroRootRef.current;

            // Stop any previous animations on the root so we don't accumulate conflicting motion.
            scene.stopAnimation(hero);

            const baseX = hero.position.x;
            const baseY = hero.position.y;
            const baseZ = hero.position.z;
            const baseRotY = hero.rotation.y;

            // Animation magnitude toned down so it reads as a "stab/step" not a teleport.
            const lungeX = baseX + 0.75; // toward the monster at x=+3
            const recoilY = baseY;
            const endX = baseX;
            const endRotY = baseRotY;
            const midRotY = baseRotY + 0.12;

            heroIdleRef.current?.stop();
            heroRunRef.current?.stop();
            heroRunRef.current?.play(false);

            const lungeAnimX = new Animation("heroLungeX", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            lungeAnimX.setKeys([
                { frame: 0, value: baseX },
                { frame: 8, value: lungeX },
                { frame: 16, value: endX }
            ]);

            const lungeAnimRotY = new Animation("heroLungeRotY", "rotation.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            lungeAnimRotY.setKeys([
                { frame: 0, value: baseRotY },
                { frame: 8, value: midRotY },
                { frame: 16, value: endRotY }
            ]);

            hero.position = new Vector3(baseX, recoilY, baseZ);
            hero.animations = [lungeAnimX, lungeAnimRotY];

            scene.beginAnimation(hero, 0, 16, false, 1.6, () => {
                // Ignore callbacks from older attacks.
                if (seq !== lungeSeqRef.current) return;
                hero.animations = [];
                heroRunRef.current?.stop();
                heroIdleRef.current?.play(true);
            });
        }, [playerAttackKey]);

    useEffect(() => {
        if (!sceneRef.current || !monsterRootRef.current) return;
        if (monsterHitKey <= 0) return;

        const seq = ++hitSeqRef.current;
        const scene = sceneRef.current;
        const monster = monsterRootRef.current;

        scene.stopAnimation(monster);

        const meshes = monster.getChildMeshes();
        const originalMats = meshes.map(m => m.material);

        if (hitFlashMatRef.current) meshes.forEach(m => (m.material = hitFlashMatRef.current!));

        // Particle burst
        if (particleSystemRef.current) {
            particleSystemRef.current.manualEmitCount = 40;
        }

        // Prefer native monster animation groups if present.
        monsterHitRef.current?.stop();
        const hitGroup = monsterHitRef.current;
        if (hitGroup) {
            hitGroup.onAnimationGroupEndObservable.addOnce(() => {
                if (seq !== hitSeqRef.current) return;
                monsterIdleRef.current?.play(true);
                // Restore hit materials
                meshes.forEach((m, idx) => { m.material = originalMats[idx]; });
            });
            hitGroup.play(false);
        } else {
            // Fallback to a simple recoil translation.
            const baseX = monster.position.x;
            const recoilX = baseX + 0.7;

            const recoilAnim = new Animation("monsterRecoilX", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            recoilAnim.setKeys([
                { frame: 0, value: baseX },
                { frame: 6, value: recoilX },
                { frame: 14, value: baseX }
            ]);

            monster.animations = [recoilAnim];
            scene.beginAnimation(monster, 0, 14, false, 2.0, () => {
                if (seq !== hitSeqRef.current) return;
                monster.animations = [];
                monsterIdleRef.current?.play(true);
                meshes.forEach((m, idx) => { m.material = originalMats[idx]; });
            });
        }
    }, [monsterHitKey]);

    // Monster 3D Aura Animation
    useEffect(() => {
        if (!auraLightRef.current || !sceneRef.current || attackDuration <= 0) return;
        const aura = auraLightRef.current;
        const scene = sceneRef.current;

        // Setup Animation
        const auraAnim = new Animation("auraIntensity", "intensity", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        
        // Intensity Curve: 
        // 0s: Idle (0.3)
        // Duration: Peak (2.5)
        // Peak+0.1s: Burst (5.0)
        // Peak+0.3s: Back to Idle (0.3)
        const framesPerSecond = 60;
        const totalDurationFrames = (attackDuration / 1000) * framesPerSecond;
        
        const keys = [
            { frame: 0, value: 0.3 },
            { frame: totalDurationFrames, value: 2.5 },
            { frame: totalDurationFrames + 6, value: 5.0 }, // Peak flash
            { frame: totalDurationFrames + 18, value: 0.3 } // Fade back
        ];
        auraAnim.setKeys(keys);

        aura.animations = [auraAnim];
        scene.beginAnimation(aura, 0, totalDurationFrames + 18, false, 1.0);

        // Animate the glow layer intensity
        if (glowLayerRef.current) {
            const glow = glowLayerRef.current;
            const glowAnim = new Animation("glowIntensity", "intensity", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            glowAnim.setKeys([
                { frame: 0, value: 0.6 }, 
                { frame: totalDurationFrames, value: 1.5 }, 
                { frame: totalDurationFrames + 20, value: 0.6 }
            ]);
            scene.beginDirectAnimation(glow, [glowAnim], 0, totalDurationFrames + 20, false);
        }

        // Animate Monster Emissive Intensity (Inner Glow)
        if (monsterRootRef.current) {
            const meshes = monsterRootRef.current.getChildMeshes();
            const emissiveAnim = new Animation("emissiveIntensity", "emissiveIntensity", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
            const standardEmissiveAnim = new Animation("standardEmissive", "emissiveColor", 60, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
            
            meshes.forEach(m => {
                if (m.material) {
                    const materialLike = m.material as unknown as { emissiveIntensity?: number; diffuseColor?: Color3 };
                    const isPBR = materialLike.emissiveIntensity !== undefined;
                    if (isPBR) {
                        emissiveAnim.setKeys([
                            { frame: 0, value: 0.2 },
                            { frame: totalDurationFrames, value: 2.0 },
                            { frame: totalDurationFrames + 6, value: 5.0 },
                            { frame: totalDurationFrames + 20, value: 0.2 }
                        ]);
                        scene.beginDirectAnimation(m.material, [emissiveAnim], 0, totalDurationFrames + 20, false);
                    } else {
                        // For StandardMaterial, we animate color brightness
                        const baseColor = materialLike.diffuseColor ?? new Color3(1,1,1);
                        standardEmissiveAnim.setKeys([
                            { frame: 0, value: baseColor.scale(0.1) },
                            { frame: totalDurationFrames, value: baseColor.scale(1.5) },
                            { frame: totalDurationFrames + 6, value: new Color3(1,1,1) },
                            { frame: totalDurationFrames + 20, value: baseColor.scale(0.1) }
                        ]);
                        scene.beginDirectAnimation(m.material, [standardEmissiveAnim], 0, totalDurationFrames + 20, false);
                    }
                }
            });
        }
    }, [attackKey, attackDuration]);

    return (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full focus:outline-none pointer-events-none" style={{ zIndex: 10 }} />
    );
}
