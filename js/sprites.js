// =============================================================
// KOFI KESE - sprite definitions (generated)
// The game loads every frame it finds in assets/sprites/<character>/<action>/
// named 01.png, 02.png ... (also accepts 1.png or "Layer 1.png").
// Put your artwork there (reference frames: kofi-kese-reference pack). Missing art = code drawing.
// w/h = canvas size, body = character height in px on that canvas, base = baseline px above the bottom (default 24),
// fps = frames per second for that action (default KK.SPRITE_FPS), pixel = draw without smoothing.
// Pixel art from Adwinifie: Kofitia (tools/kofi_gen.py), everyone else (tools/cast_gen.py), giant_* = mini-bosses.
// Kofitia: pixel art from Adwinifie (exports/kofi = gold afena, exports/kofi_palm = palm-leaf sword), x4, feet at (320,356).
// =============================================================
window.KK = window.KK || {};
KK.SPRITE_DEFS = {
 "chars": {
  "kofitia_afenakwa": {
   "w": 640,
   "h": 384,
   "body": 160,
   "base": 28,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "run": {
     "loop": true,
     "fps": 12
    },
    "jump": {
     "loop": false,
     "fps": 12
    },
    "fall": {
     "loop": true,
     "fps": 10
    },
    "land": {
     "loop": false,
     "fps": 12
    },
    "double_jump": {
     "loop": false,
     "fps": 14
    },
    "dodge": {
     "loop": false,
     "fps": 16
    },
    "air_dash": {
     "loop": false,
     "fps": 16
    },
    "climb": {
     "loop": true,
     "fps": 10
    },
    "crouch": {
     "loop": true,
     "fps": 6
    },
    "pan_jump": {
     "loop": true,
     "fps": 10
    },
    "talk": {
     "loop": true,
     "fps": 8
    },
    "attack_1": {
     "loop": false,
     "fps": 14
    },
    "attack_2": {
     "loop": false,
     "fps": 14
    },
    "attack_3": {
     "loop": false,
     "fps": 14
    },
    "attack_4": {
     "loop": false,
     "fps": 14
    },
    "attack_5": {
     "loop": false,
     "fps": 16
    },
    "heavy_1": {
     "loop": false,
     "fps": 14
    },
    "heavy_2": {
     "loop": false,
     "fps": 14
    },
    "crouch_attack": {
     "loop": false,
     "fps": 14
    },
    "crouch_heavy": {
     "loop": false,
     "fps": 12
    },
    "air_attack": {
     "loop": false,
     "fps": 14
    },
    "air_heavy_2": {
     "loop": false,
     "fps": 16
    },
    "headbutt": {
     "loop": false,
     "fps": 14
    },
    "stomp": {
     "loop": false,
     "fps": 12
    },
    "shield": {
     "loop": true,
     "fps": 16
    },
    "hurt": {
     "loop": false,
     "fps": 12
    },
    "dizzy": {
     "loop": true,
     "fps": 8
    },
    "receive_sword": {
     "loop": false,
     "fps": 12
    },
    "release_sword": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "kofitia_palm": {
   "w": 640,
   "h": 384,
   "body": 160,
   "base": 28,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "run": {
     "loop": true,
     "fps": 12
    },
    "jump": {
     "loop": false,
     "fps": 12
    },
    "fall": {
     "loop": true,
     "fps": 10
    },
    "land": {
     "loop": false,
     "fps": 12
    },
    "double_jump": {
     "loop": false,
     "fps": 14
    },
    "dodge": {
     "loop": false,
     "fps": 16
    },
    "air_dash": {
     "loop": false,
     "fps": 16
    },
    "climb": {
     "loop": true,
     "fps": 10
    },
    "crouch": {
     "loop": true,
     "fps": 6
    },
    "pan_jump": {
     "loop": true,
     "fps": 10
    },
    "talk": {
     "loop": true,
     "fps": 8
    },
    "attack_1": {
     "loop": false,
     "fps": 14
    },
    "attack_2": {
     "loop": false,
     "fps": 14
    },
    "attack_3": {
     "loop": false,
     "fps": 14
    },
    "attack_4": {
     "loop": false,
     "fps": 14
    },
    "attack_5": {
     "loop": false,
     "fps": 16
    },
    "heavy_1": {
     "loop": false,
     "fps": 14
    },
    "heavy_2": {
     "loop": false,
     "fps": 14
    },
    "crouch_attack": {
     "loop": false,
     "fps": 14
    },
    "crouch_heavy": {
     "loop": false,
     "fps": 12
    },
    "air_attack": {
     "loop": false,
     "fps": 14
    },
    "air_heavy_2": {
     "loop": false,
     "fps": 16
    },
    "headbutt": {
     "loop": false,
     "fps": 14
    },
    "stomp": {
     "loop": false,
     "fps": 12
    },
    "shield": {
     "loop": true,
     "fps": 16
    },
    "hurt": {
     "loop": false,
     "fps": 12
    },
    "dizzy": {
     "loop": true,
     "fps": 8
    },
    "receive_sword": {
     "loop": false,
     "fps": 12
    },
    "release_sword": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "odade": {
   "w": 448,
   "h": 480,
   "body": 208,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "hammer": {
     "loop": true,
     "fps": 10
    },
    "talk": {
     "loop": true,
     "fps": 8
    },
    "give": {
     "loop": false,
     "fps": 10
    }
   }
  },
  "basa": {
   "w": 448,
   "h": 496,
   "body": 240,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "catch": {
     "loop": false,
     "fps": 10
    }
   }
  },
  "snake": {
   "w": 448,
   "h": 176,
   "body": 96,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 6
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  },
  "goat": {
   "w": 480,
   "h": 256,
   "body": 176,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  },
  "fowl": {
   "w": 256,
   "h": 208,
   "body": 128,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 12
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "monkey": {
   "w": 384,
   "h": 288,
   "body": 168,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 12
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "panther": {
   "w": 640,
   "h": 256,
   "body": 160,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "white_mmoatia": {
   "w": 384,
   "h": 288,
   "body": 192,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "gold_mask": {
   "w": 288,
   "h": 288,
   "body": 192,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 8
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "gold_lion": {
   "w": 704,
   "h": 336,
   "body": 208,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  },
  "gold_slime": {
   "w": 288,
   "h": 208,
   "body": 120,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "red": {
   "w": 448,
   "h": 336,
   "body": 208,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "run": {
     "loop": true,
     "fps": 12
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "shoot": {
     "loop": false,
     "fps": 12
    },
    "stagger": {
     "loop": false,
     "fps": 10
    },
    "heal": {
     "loop": true,
     "fps": 6
    }
   }
  },
  "blue": {
   "w": 448,
   "h": 336,
   "body": 208,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "run": {
     "loop": true,
     "fps": 12
    },
    "attack": {
     "loop": true,
     "fps": 16
    },
    "stagger": {
     "loop": false,
     "fps": 10
    },
    "heal": {
     "loop": true,
     "fps": 6
    }
   }
  },
  "samanteng": {
   "w": 704,
   "h": 496,
   "body": 320,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "walk": {
     "loop": true,
     "fps": 8
    },
    "claw": {
     "loop": false,
     "fps": 14
    },
    "shoot": {
     "loop": false,
     "fps": 10
    },
    "frenzy": {
     "loop": true,
     "fps": 16
    },
    "rest": {
     "loop": true,
     "fps": 6
    },
    "seize": {
     "loop": false,
     "fps": 10
    }
   }
  },
  "sasabonsam": {
   "w": 832,
   "h": 496,
   "body": 240,
   "base": 120,
   "pixel": true,
   "anims": {
    "fly": {
     "loop": true,
     "fps": 12
    },
    "perch": {
     "loop": true,
     "fps": 6
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "dive": {
     "loop": true,
     "fps": 14
    },
    "shoot": {
     "loop": false,
     "fps": 10
    }
   }
  },
  "barafo": {
   "w": 1280,
   "h": 832,
   "body": 432,
   "base": 64,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "walk": {
     "loop": true,
     "fps": 8
    },
    "slash_windup": {
     "loop": false,
     "fps": 10
    },
    "slash": {
     "loop": false,
     "fps": 14
    },
    "sweep_windup": {
     "loop": false,
     "fps": 10
    },
    "sweep": {
     "loop": false,
     "fps": 14
    },
    "leap": {
     "loop": false,
     "fps": 10
    },
    "slam": {
     "loop": false,
     "fps": 12
    },
    "recover": {
     "loop": false,
     "fps": 8
    },
    "regenerate": {
     "loop": true,
     "fps": 10
    }
   }
  },
  "giant_white_mmoatia": {
   "w": 768,
   "h": 576,
   "body": 384,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_snake": {
   "w": 896,
   "h": 352,
   "body": 192,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 6
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  },
  "giant_fowl": {
   "w": 512,
   "h": 416,
   "body": 256,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 12
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_monkey": {
   "w": 768,
   "h": 576,
   "body": 336,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 12
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_gold_mask": {
   "w": 576,
   "h": 576,
   "body": 384,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 8
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_gold_slime": {
   "w": 576,
   "h": 416,
   "body": 240,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_goat": {
   "w": 960,
   "h": 512,
   "body": 352,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  },
  "giant_panther": {
   "w": 1280,
   "h": 512,
   "body": 320,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 12
    }
   }
  },
  "giant_gold_lion": {
   "w": 1408,
   "h": 672,
   "body": 416,
   "base": 24,
   "pixel": true,
   "anims": {
    "idle": {
     "loop": true,
     "fps": 8
    },
    "move": {
     "loop": true,
     "fps": 10
    },
    "windup": {
     "loop": false,
     "fps": 8
    },
    "attack": {
     "loop": false,
     "fps": 14
    }
   }
  }
 },
 "proj": {
  "proj_red": {
   "w": 256,
   "h": 256
  },
  "proj_flame": {
   "w": 256,
   "h": 256
  },
  "proj_purple": {
   "w": 256,
   "h": 256
  },
  "proj_shockwave": {
   "w": 384,
   "h": 128
  },
  "proj_power_wave": {
   "w": 256,
   "h": 384
  }
 },
 "vfx": {},
 "pickups": {
  "banana": {
   "w": 128,
   "h": 128
  },
  "cocoa": {
   "w": 128,
   "h": 128
  },
  "gye_nyame": {
   "w": 128,
   "h": 128
  }
 }
};
KK.SPRITE_FPS = 12;
