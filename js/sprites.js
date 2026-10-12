// =============================================================
// KOFI KESE - sprite definitions (generated)
// The game loads every frame it finds in assets/sprites/<character>/<action>/
// named 01.png, 02.png ... (also accepts 1.png or "Layer 1.png").
// Put your artwork there (reference frames: kofi-kese-reference pack). Missing art = code drawing.
// w/h = canvas size, body = character height in px on that canvas, base = baseline px above the bottom (default 24),
// fps = frames per second for that action (default KK.SPRITE_FPS), pixel = draw without smoothing.
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
   "w": 384,
   "h": 384,
   "body": 208,
   "anims": {
    "idle": {
     "loop": true
    },
    "hammer": {
     "loop": true
    },
    "talk": {
     "loop": true
    },
    "give": {
     "loop": false
    }
   }
  },
  "basa": {
   "w": 384,
   "h": 512,
   "body": 240,
   "anims": {
    "idle": {
     "loop": true
    },
    "catch": {
     "loop": false
    }
   }
  },
  "snake": {
   "w": 512,
   "h": 256,
   "body": 96,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "goat": {
   "w": 512,
   "h": 384,
   "body": 176,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "fowl": {
   "w": 384,
   "h": 256,
   "body": 128,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "monkey": {
   "w": 384,
   "h": 384,
   "body": 168,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "panther": {
   "w": 640,
   "h": 384,
   "body": 160,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "white_mmoatia": {
   "w": 384,
   "h": 384,
   "body": 192,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "gold_mask": {
   "w": 384,
   "h": 384,
   "body": 192,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "gold_lion": {
   "w": 640,
   "h": 384,
   "body": 208,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "gold_slime": {
   "w": 384,
   "h": 256,
   "body": 120,
   "anims": {
    "idle": {
     "loop": true
    },
    "move": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "attack": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "red": {
   "w": 512,
   "h": 384,
   "body": 208,
   "anims": {
    "idle": {
     "loop": true
    },
    "run": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "shoot": {
     "loop": false
    },
    "stagger": {
     "loop": false
    },
    "heal": {
     "loop": true
    },
    "death": {
     "loop": false
    }
   }
  },
  "blue": {
   "w": 512,
   "h": 384,
   "body": 208,
   "anims": {
    "idle": {
     "loop": true
    },
    "run": {
     "loop": true
    },
    "attack": {
     "loop": true
    },
    "stagger": {
     "loop": false
    },
    "heal": {
     "loop": true
    },
    "death": {
     "loop": false
    }
   }
  },
  "samanteng": {
   "w": 640,
   "h": 640,
   "body": 320,
   "anims": {
    "idle": {
     "loop": true
    },
    "walk": {
     "loop": true
    },
    "claw": {
     "loop": false
    },
    "shoot": {
     "loop": false
    },
    "frenzy": {
     "loop": true
    },
    "rest": {
     "loop": true
    },
    "seize": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "sasabonsam": {
   "w": 768,
   "h": 512,
   "body": 240,
   "anims": {
    "fly": {
     "loop": true
    },
    "perch": {
     "loop": true
    },
    "windup": {
     "loop": false
    },
    "dive": {
     "loop": true
    },
    "shoot": {
     "loop": false
    },
    "death": {
     "loop": false
    }
   }
  },
  "barafo": {
   "w": 1408,
   "h": 768,
   "body": 432,
   "anims": {
    "idle": {
     "loop": true
    },
    "walk": {
     "loop": true
    },
    "slash_windup": {
     "loop": false
    },
    "slash": {
     "loop": false
    },
    "sweep_windup": {
     "loop": false
    },
    "sweep": {
     "loop": false
    },
    "leap": {
     "loop": false
    },
    "slam": {
     "loop": false
    },
    "recover": {
     "loop": false
    },
    "regenerate": {
     "loop": false
    },
    "death": {
     "loop": false
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
