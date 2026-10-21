export interface StarshipModification {
  system: string;
  type: string;
  name: string;
  description: string;
  baseCost: number;
  grade: string;
  prerequisite: string;
  requiresTargetWeapon: boolean;
}

export const starshipModifications: StarshipModification[] = [
  {
    system: "Engines",
    type: "Engineering System",
    name: "ADVANCED SLAM",
    description: "Your ship's SubLight Acceleration Motor (SLAM) has been enhanced, granting more utility. When a pilot takes the Dash action, the increase now equals twice your speed, after applying any modifiers. With a speed of 300 feet, for example, your ship can move up to 900 feet on its turn if you dash. Any increase or decrease to your speed changes this additional Movement by the same amount. If your ship's speed of 300 feet is reduced to 150 feet, for instance, your ship can move up to 450 feet this turn if you dash. This action still affects your entire ship: any skill check or attack roll made by your ship or anyone on it has disadvantage. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "SLAM",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "ALTERNATIVE FUEL CONVERTER",
    description: "Your ship is equipped with an alternative fuel converter which allows the conversion of materials to a potential fuel source. Over the course of 10 minutes, a crew member can make a constitution (Regulation) check (DC = 10 or half the number of days since the ship's last refueling, whichever number is higher). On a success, the ship recovers one day's worth of fuel. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship undergoes refitting.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "AUTOMATED PROTOCOLS",
    description: "You upgrade your damage control system. A crew member can take the Patch action as a reaction. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship undergoes refitting. Additionally, you can add your ship's intelligence modier (minimum of +1) to whenever you roll hull dice to regain hull points. Finally, your ship is expertly equipped for Constitution (Patch) checks.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Damage Control System",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "BOARDING HARPOON",
    description: "Your ship has been further modified with a massive grappling harpoon, through which creatures can pass. Your ship is expertly equipped for Strength (Ram) checks. Additionally, when a deployed pilot takes the Ram action, on a hit, they become harpooned. While harpooned, the target ship's flying speed is reduced to 0, and your ship's flying speed is  educed by half. Your ship's pilot can release the harpooned ship at any time (no action required). The harpooned ship is automatically released if your ship becomes disabled, or if it is forcefully moved more than 100 feet away from your ship.  \"Removing the Harpoon.\" A harpooned ship's pilot can use its action to make a contested Strength (Boost) check, ending the effect on a success. \"Moving a Harpooned Ship.\" When your ship moves, it can drag the harpooned ship with it, unless the ship is larger than your ship. \"Boarding a Harpooned Ship.\" While the ship is harpooned, up to six creatures of Medium size or smaller can move through the gap onto the harpooned ship each round. \"Recovering the Harpoon.\" Recovering and reinstalling the harpoon takes 1 minute.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Hardened Prow",
    requiresTargetWeapon: true
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "BUZZ DROID CLOUD",
    description: "As an action, a crew member may scatter a large number of Buzz Droids across space in a 200-foot radius sphere centered on a point within 1500 feet. These Buzz Droids tear apart the hull of any ship that encounters them. The area becomes difficult terrain for the duration. When a ship moves into or within the area, it takes 2d4 kinetic damage directly to the hull for every 50 feet it travels. The Buzz Droids are nearly invisible in the darkness of space. Any creature or ship that can’t see the area at the time the area is created must make a Wisdom (Scan) check (DC 15) to notice the Buzz Droids before entering the area. The effects of this feature last until the beginning of your next turn unless the crewmember uses a bonus action to maintain it. This feature can be used a number of times equal to your ship’s tier (a minimum of once). All expended uses are regained when the ship is refitted.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "CARBONITE LAUNCHER, MK I",
    description: "As an action, a crew member may cause a wave of cold energy to spread out from your ship. Each ship in a 150-foot cone must make a Constitution saving throw (DC = 8 + prof. bonus + ship's wisdom modifier). On a failed save, a ship takes 2d6 cold damage and gains a level of slowed until the end of its next turn. On a success, it takes half as much damage, and suffers no additional effect. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "CARBONITE LAUNCHER, MK II",
    description: "As an action, a crew member may cause an explosion of cold energy to erupt from a point it chooses within 900 feet. Each ship in a 50-foot-radius sphere centered on that point must make a Dexterity saving throw (DC = 8 + prof. bonus + ship's wisdom modifier). On a failed save, a ship takes 3d6 cold damage, and gains 1 slowed level until the start of your next turn. On a successful save, a ship takes half as much damage and isn’t slowed. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Carbonite Launcher, Mk I",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "CARBONITE LAUNCHER, MK III",
    description: "A storm of cryogenic energy encompasses space in a 300-foot-radius sphere centered on a point within 1200 feet. Each ship in the cylinder must make a Dexterity saving throw (DC = 8 + prof. bonus + ship's wisdom modier). A creature takes 2d8 kinetic damage and 4d6 cold damage on a failed save, or half as much damage on a successful one. The storm’s area of effect becomes difficult terrain until the end of your next turn. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Carbonite Launcher, Mk II",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "CARBONITE LAUNCHER, MK IV",
    description: "As an action, your ship can create a cloud of icy fog in a 200-foot-radius sphere centered on a point within 1200 feet. The sphere extends around objects, and its area is heavily obscured. The fog is semi-solid, and its area is considered difficult terrain. Each ship that enters the area for the first time on a turn or starts its turn there takes 4d6 cold damage and gains 1 slowed level until the end of its turn. The fog lasts for one minute or until it’s dispersed. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Carbonite Launcher, Mk III",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "CARBONITE LAUNCHER, MK V",
    description: "As an action, a crew member may generate an explosion of cryogenic energy in a 600-foot-radius sphere centered on a point you can see within 2500 feet. Each ship in the affected area must make a Constitution saving throw (DC = 8 + prof. bonus + ship's wisdom modifier). On a failed save, the ship takes 8d6 + 20 cold damage and is stunned for 1 minute as it is encased in carbonite. On a successful save, the ship takes half damage and is stunned until the end of its next turn. As an action, a crew member of a stunned ship can make a Strength check (DC = 8 + prof. bonus + ship's wisdom modier), ending this effect on itself on a success. A ship reduced to 0 hit points by this power explodes instantly, as its hull shatters into frozen chunks.This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "5",
    prerequisite: "Carbonite Launcher, Mk IV",
    requiresTargetWeapon: true
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "COUNTERMEASURES",
    description: "This modification adds a series of countermeasures to the ship, granting it a more active approach to ward off effects. Once per round, when your ship is forced to make a saving throw against an effect that would cause it to be blinded, ionized, shocked, stalled, or stunned, a  crew member can use their reaction to add the ship's Wisdom modifier to the roll (minimum of +1).",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "DAMAGE CONTROL SYSTEM",
    description: "You install a damage control system on your ship. A crew member can take the Patch action as a bonus action. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship undergoes reffitting. Additionally, your ship is proficiently equipped for Constitution (Patch) checks.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTRICAL DISCHARGERS",
    description: "As an action a crew member may cause your ship to emit a burst of electricity. Each ship within 50 feet, other than you, must succeed on a Dexterity saving throw (DC = 8 + prof. bonus + ship's strength modifier) or take 1d6 lightning damage. This power’s damage increases by 1d6 for every tier your ship is above first tier: 2nd tier (2d6), 3rd tier (3d6), 4th tier (4d6), and 5th tier (5d6). This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTROMAGNETIC SCRAMBLER, MK I",
    description: "As an action, a crew member can cause a ship you can see within 300 feet to become shrouded with electronic interference and holographic illusions. The target must succeed on a Wisdom saving throw (DC = 8 + prof. bonus + ship's charisma modier), or it takes 1d6 lightning damage and moves 50 feet in a random direction if it can move and its speed is at least 50 feet. Roll a d4 for the direction: 1, north; 2, south; 3, east; or 4, west. If the direction rolled is blocked, the target doesn’t move. This power’s damage increases by 1d6 for every tier your ship is above first tier: 2nd tier (2d6), 3rd tier (3d6), 4th tier (4d6), and 5th tier (5d6). This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTROMAGNETIC SCRAMBLER, MK II",
    description: "As an action, a crew member may choose up to three ships that you can see within 300 feet to make Wisdom saving throws (DC = 8 + prof. bonus + ship's charisma modifier). The first time each turn a target that fails this saving throw makes an attack roll or a saving throw for up to a minute until the ability ends, the target must roll a d4 and subtract the number rolled from the attack roll or saving throw. A crew member must use it's bonus action to maintain this ability. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Electromagnetic Scrambler, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTROMAGNETIC SCRAMBLER, MK III",
    description: "You choose one ship you can see within 1200 feet and scramble its ability to differentiate targets. The target must make a Wisdom saving throw (DC = 8 + prof. bonus + ship's charisma modier). If the ship is directly piloted by a humanoid that is not incapacitated, it gains a bonus to the saving throw equal to the pilot’s Intelligence modier. On a failed save, the target loses the ability to distinguish friend from foe, regarding all ships it can see as enemies until the power ends. Each time the target takes damage, it can repeat the saving throw, ending the effect on itself on a success. Whenever the affected ship chooses another target, it must choose the target at random from among the ships it can see within range of the attack, power, or other ability it’s using. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Electromagnetic Scrambler, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTROMAGNETIC SCRAMBLER, MK IV",
    description: "As an action, a crew member may scramble the targeting protocols of nearby ships. Each ship in a 300- foot-radius sphere centered on a point within 1200 feet must make a Wisdom saving throw (DC = 8 + prof. bonus + ship's charisma modier). If the ship is directly piloted by a humanoid that is not incapacitated, it gains a bonus to the saving throw equal to the pilot’s Intelligence modier. On a failed save, the target loses the ability to distinguish friend from foe, regarding all creatures it can see as enemies up to a minute, until the ability ends. Each time the target takes damage, it can repeat the saving throw, ending the effect on itself on a success. A crew member must use it's bonus action to maintain this ability. Whenever the affected ship chooses another target, it must choose the target at random from among the ships it can see within range of the attack, power, or other ability it's using. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Electromagnetic Scrambler, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "ELECTROMAGNETIC SCRAMBLER, MK V",
    description: "You emit an electromagnetic pulse, potentially shutting down all ships besides your own within 1200 feet. Ships within range must succeed on a Wisdom (DC = 8 + prof. bonus + ship's charisma modier) or become disabled up to a minute or until the power ends. A crew member must use their bonus action to maintain this ability. Each time the target takes damage, it makes a new Wisdom saving throw against the power. If the saving throw succeeds, the power ends. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "5",
    prerequisite: "Electromagnetic Scrambler, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "EMERGENCY GENERATOR",
    description: "Your ship is equipped with an emergency generator to recharge shields. When your ship is reduced to 0 shield points but not destroyed outright, a crew member can use their reaction to have it drop to 1 shield point instead. Alternatively, if the ship has 0 shield points, a crew member can use their action to restore shield points equal to twice the ship's strength modier. Once either feature has been used, the power backup can't be used again until the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Power Backup",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Engineering System",
    name: "FEEDBACK SHIELD",
    description: "Your ship's shield is enhanced to reflect damage to would-be attackers. As a reaction to the ship being hit with a primary or secondary weapon, a crew member can use their reaction to deal damage to the attacking ship. The damage depends on your ship's size: 1d4 for a Tiny ship, 1d6 for a Small ship, 1d8 for a Medium ship, 1d10 for a Large ship, 1d12 for a huge ship, or 1d20 for a Gargantuan ship. The damage is of the same type dealt by the original attack.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "FLARE PODS",
    description: "Your ship is a equipped with a series of countermeasure flares. When your ship is forced to make a Dexterity saving throw, a crew member can use their reaction to release a flare. When they do so, your ship has advantage on the triggering saving throw. The crew member can choose to use this feature after the roll is made, but before the GM says whether the roll succeeds or fails. If they already have advantage on the saving throw, they can instead reroll one of the dice once. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship undergoes reffitting.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "Countermeasures",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Engineering System",
    name: "HARDENED PROW",
    description: "Your ship has been modified to to be more effective at  ramming. When a deployed pilot takes the Ram action, and the target fails the saving throw, the damage dealt is increased by an amount equal to two of your ship's Hull Dice. Additionally, your ship is proficiently equipped for Strength (Ram) checks.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "IMPROVED COUNTERMEASURES",
    description: "This modification enhances your ship's countermeasures, allowing it to quickly clear lingering effects. As an action, a crew member can activate this feature, ending the blinded, ionized, shocked, stalled, and stunned conditions. This feature can be used a number of times equal to your ship's tier. All expended uses are regained when the ship undergoes reffitting. Additionally, your ship is expertly equipped for Wisdom saving throws. If it was already expertly equipped, the ship can now add half its Constitution modier (rounded down) to its Wisdom saving throws.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Countermeasures",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "INTERDICTION DRIVE",
    description: "You install an interdiction drive on your ship, which can be activated to impede ships around it. As an action, a crew member can engage the interdiction drive. Each ship within 100 feet of your ship must make a Strength saving throw (DC = 8 + the crew members's prociency bonus + the ship's Strength modier). On a failed save, a ship's flying speed is reduced by 100 feet and its turning speed is increased by 50 feet until the end of your ship's next turn. If a ship is two or more sizes larger than your ship, it has advantage on the saving throw. If it is two or more sizes smaller, it instead has disadvantage. This feature can be used a number of times equal to your ship's tier. All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Gravity Well Projector",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Engineering System",
    name: "INVULNERABILITY DRIVE",
    description: "Your ship is equipped with an experimental device which can render it immune to all damage. As an action, a crew member can activate the drive. Once activated, the drive lasts for 1d4 rounds, granting the following benefits: Your ship is immune to all damage. Your ship's flying speed is reduced by half. Your ship's turning speed is doubled. A crew member can end this effect at any time, no action required. When the effect ends, the crew member must make a Destruction saving throw. On a failure, the ship suffers 1 level of system damage. Once this feature has been used, it can't be used again until the ship undergoes reffitting.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Feedback Shield",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "MINING LASER",
    description: "Your ship is equipped with a laser used to extract ores and other minerals from objects such as asteroids. Checks made while using the mining laser for determining outcomes of work (for example, using downtime rules from Wretched Hives) are made with advantage. If you already have advantage on the roll, you can instead reroll one of the dice once. Additionally, a crew member can activate the mining laser as an action in order to make a Strength (Boost) check against a ship that is touching you (for example, a ship that is ramming or being rammed by your ship, or one you are landed on) (DC = the ship's AC). On a success, the adjacent ship takes 1d8 + Strength modifier energy damage.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "NANO-DROID DISTRIBUTOR",
    description: "Your ship is equipped with a nano-droid distributor that allows it to repair other ships. When a crew member takes the Patch action, they can instead repair another ship within 100 feet. You spend and roll one of your ship's Hull Dice, and the target ship regains that many hull points.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "POWER BACKUP",
    description: "Your ship is equipped with a back up battery, which can give it renewed energy. When your ship is reduced to 0 hull points but not destroyed outright, a crew member can use their reaction to have it drop to 1  hull point instead. Alternatively, if the ship is making Destruction saving throws, a crew member can use their action to have the ship automatically succeed on a Destruction saving throw. Once either feature has been used, the power backup can't be used again until the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "POWER HARPOON",
    description: "As an action, a crew member may make a ship weapon attack with the power harpoon. The harpoon's range is 400/1600 ft. On a hit, the target is harpooned, connecting your ship to the target by a 1,600 foot cable. At any time as a free action, if the connected objects are closer than 1600 feet, a crew member on your ship can choose whether the cable is  lack or taught. When the cable is taught, any movement by one object away from the other, tows the other object. When the cable is taught, movement by the first object away from the other object is considered movement through difficult terrain if the first object is within one size category of the other object. An object two or more size categories smaller than the other object cannot move away from the other object when the cable is taught. If the objects are 1600 feet apart, the cable is always taught. While connected by the cable, a crew member can use a bonus action to reel, pulling your ship towards the target (if larger than your ship), or the target towards your ship (if the same size or smaller than your ship) by 200 feet. At any time, a crew member on your ship can release the cable (no action required).As an action, a crew member of a harpooned ship can attempt to remove the harpoon. To do so, the ship must succeed on a Strength (boost) check contested by your Strength (boost) or Dexterity (maneuver) check. Once this feature has been used, it can't be used again until the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "Boarding Harpoon",
    requiresTargetWeapon: true
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "SELF-DESTRUCT MECHANISM",
    description: "Your ship is equipped with a self-destruct mechanism that can cause immense destruction at the expense of the ship. A crew member can activate the self-destruct mechanism as an action, setting a timer up to 10 minutes in length. When the timer expires, the ship explodes, dealing thermite damage to each enemy within range. The damage is calculated as follows; for each Hull Die the ship has, roll it and add the ship's Strength modifier to the roll. The range that the self-destruct mechanism impacts varies, depending on the ship's size: Tiny: A Tiny ship deals damage to each ship within 50 feet of it.Small: A Small ship deals damage to each ship within 100 feet of it. Medium: A Medium ship deals damage to each ship within 200 feet of it. Large: A Large ship deals damage to each ship within 400 feet of it. Huge: A Huge ship deals damage to each ship within 1,000 feet of it. Gargantuan: A Gargantuan ship deals damage to each ship within 2,000 feet of it.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "SHIELD BLEEDTHROUGH",
    description: "Your ship's reactor is overhauled to give temporary boosts to your ship's weapon batteries. When your ship hits another ship with a primary or secondary weapon attack while it still has shield points, a crew member can use their reaction to cause some of the damage to bleed through. The damage the ship's shields take is reduced by an amount equal to your ship's Strength modier. The ship's hull then takes this much damage. This damage is of the same type as the weapon's damage.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "SHIP SLICER, MK I",
    description: "Choose a Small or smaller ship you can see. The target must make an Intelligence (DC = 8 + prof. bonus + ship's charisma modier) saving throw. On a failed save, it is disabled until the start of your next turn. Each time the ship takes damage or is the target of a hostile power or ability while disabled in this way, it can repeat this saving throw, ending the effect on a success. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "SHIP SLICER, MK II",
    description: "As an action, a crew member may upload a computer virus that stalls a ship. Roll 7d6; if the ship’s remaining hull points are less than the total, the ship is stalled for one minute or until the ship takes damage,. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Ship Slicer, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "SHIP SLICER, MK III",
    description: "As an action, a crew member can dictate a one-word command to a ship you can see within 600 feet. The target must succeed on an Intelligence saving throw (DC = 8 + prof. bonus + ship's charisma modifier) or follow the command on its next turn. If the ship is directly piloted by a humanoid that is not incapacitated, it gains a bonus to the saving throw equal to the pilot’s Intelligence modifier. Some typical commands and their effects follow. You might issue a command other than one described here. If you do so, the GM determines how the target behaves. If the target can’t follow your command, the ability ends. Approach. The target moves toward you by the shortest and most direct route, ending its turn if it moves within 5 feet of you. Deactivate. The target becomes disabled and then ends its turn. Flee. The target spends its turn moving away from you by the fastest available means. Halt. The target doesn’t move and takes no actions. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Ship Slicer, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "SHIP SLICER, MK IV",
    description: "As an action, a crew member may cause a ship that you can see within 600 feet to succeed on an Intelligence saving throw (DC = 8 + prof. bonus + ship's charisma modifier) or be incapacitated for up to a minute, until the ability ends. At the end of each of its turns, the ship can make another Intelligence saving throw. On a success, the power ends on the target. A crew member must use it's bonus action to maintain this ability. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Ship Slicer, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Engineering System",
    name: "SHIP SLICER, MK V",
    description: "As an action, a crew member can choose one ship you can see within 600 feet and attempt to remotely override its controls. The target must make an Intelligence saving throw (DC = 8 + prof. bonus + ship's charisma modier). If the ship is directly piloted by a humanoid that is not incapacitated, it gains a bonus to the saving throw equal to the pilot’s intelligence modifier. If you or ships that are friendly to you are fighting it, it has advantage on the saving throw. On a failed save, the ship is charmed by you for the duration. While the ship is charmed, you have a wireless link with it as long as the two of you are within the same system. Via your ship, you can use this link to issue commands to the ship while you are conscious (using a bonus action), which it does its best to obey. You can specify a simple and general course of action, such as “Attack that ship,” “Move over there,” or “Fly casual.” If the ship completes the order and doesn’t receive further direction from you, it defends and preserves itself to the best of its ability. You can use your action to take total and precise control of the target. Until the end of your next turn, the ship takes only the actions you choose, and doesn’t do anything that you don’t allow it to do. During this time, you can also cause the ship to use a reaction, but this requires you to use your own reaction as well. For every action, bonus action, or reaction you make the ship use, you must spend an equivalent action. Each time the target takes damage, it makes a new Intelligence saving throw against the power. If the saving throw succeeds, the power ends. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "5",
    prerequisite: "Ship Slicer, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Engineering System",
    name: "SHOCK ABSORBERS",
    description: "Your ship has been modified to withstand sudden impacts, and to be more effective at ramming. Your ship has resistance to kinetic damage caused by ramming.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "SHOCKING HARPOON",
    description: "Your ship's harpoon has been modified, allowing it to conduct bursts of energy into the harpooned ship. A harpooned ship has disadvantage on the contested Strength (Boost) check to remove the harpoon. Additionally, as an action on each of their turns, a crew member can deal pulse damage to a harpooned ship. The damage is equal to one of your ship's shield Dice + your ship's Strength modifier. Finally, when your ship makes a Strength (Ram) check, it can reroll one of the dice.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Power Harpoon",
    requiresTargetWeapon: true
  },
  {
    system: "Engines",
    type: "Engineering System",
    name: "SLAM",
    description: "Your ship gains a SubLight Acceleration Motor (SLAM). As an action, a pilot can activate the SLAM to gain extra Movement for the current turn. The increase equals your speed, after applying any modifiers. With a speed of 300 feet, for example, your ship can move up to 600 feet on its turn if you SLAM. Any increase or decrease to your speed changes this additional Movement by the same amount. If your ship's speed of 300 feet is reduced to 150 feet, for instance, your ship can move up to 300 feet this turn if you SLAM. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Operation system",
    name: "TIBANA GAS PROJECTOR, MK I",
    description: "As an action, a crew member can dump a load of tibana gas in a 100-foot cube within 600 feet. For the duration, it is difficult terrain. When the gas appears, each ship in its area must succeed on a Dexterity saving throw (DC = 8 + prof. bonus + ship's constitution modifier) or become ionized. A ship that enters the area or ends its turn there must also succeed on a Dexterity saving throw. The gas is flammable. Any 50 foot square of the gas exposed to fire burns away in one round. Each ship that enters the fire or starts it turn there must make a Dexterity saving throw, taking 3d6 fire damage on a failed save, or half as much on a successful one. The fire ignites any flammable objects in the area. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Operation system",
    name: "TIBANA GAS PROJECTOR, MK II",
    description: "As an action, a crew member can shoot a thin sheet of flames from the ship. Each ship in a 150-foot cone must make a Dexterity saving throw (DC = 8 + prof. bonus + ship's constitution modier). A ship takes 3d6 fire damage on a failed save, or half as much damage on a successful one. The fire ignites any flammable objects in the area. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Tibanna Gas Projector, Mk I",
    requiresTargetWeapon: true
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "ACTIVE CAMOUFLAGE",
    description: "This system improves the stealth mode function on your ship. While active, your ship no longer has disadvantage on Intelligence (Probe) and Wisdom (Scan) checks that rely on scanners, and no longer has to roll on the Hyperspace Mishaps table before entering hyperspace while stealth mode is active. Additionally, your ship is expertly equipped for Dexterity (Hide) checks. If it is already expertly equipped, it instead gains a bonus equal to half the ship's tier (rounded up)",
    baseCost: 3500,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Operation system",
    name: "ASTROMECH SOCKET",
    description: "This system adds space for an astromech crew member and allows a single deployed astromech crew member to take the Boost Engines, Boost Shields, and Boost Weapons action as a bonus action on their turn.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "Ship size Medium or smaller",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "BACKUP HYPERDRIVE",
    description: "This modification adds a backup hyperdrive slot on your ship and includes a class 15 hyperdrive. A crew member can switch to or from the backup hyperdrive as an action.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "CLOAKING DEVICE",
    description: "This system massively improves the stealth mode function on your ship, becoming a true cloaking device. While active, your ship is invisible. Additionally, when your ship makes a Dexterity (Hide) check while your cloaking device is active, it has advantage on the roll. If your ship already has advantage on the ability check, you can instead reroll one of the dice once",
    baseCost: 3500,
    grade: "5",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "Communications PACKAGE, PREMIUM",
    description: "This modification augments the native communications on your ship. Crew members can now communicate in real time with any planets, space stations, and starships in the same sector as you as long as they are similarly equipped. Additionally, your ship is prociently equipped for Charisma (Broadcast) checks.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "Communications PACKAGE, PROTOTYPE",
    description: "This modication improves the native communications on your ship. Crew members can now communicate in real time with any planets, space stations, and starships in the same territory as you as long as they are similarly equipped. Additionally, when your ship sends out communications, those communications can be encrypted, only understandable by recipients with the cipher. A crew member can encrypt communications by making an Intelligence (Slicer Tools) check, setting the decrypt DC. Another crew member can spend 1 minute attempting to decode the encrypted communications by making an Intelligence check against the decrypt DC. On a success, they decrypt the message. On a failure, they do not decrypt your encrypted message, and can't attempt to do so again for one day. Lastly, your ship is expertly equipped for Charisma (Broadcast) checks.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "Communications PACKAGE, RENOWNED",
    description: "This modication massively improves the native communications on your ship. Crew members can now communicate in real time with any planets, space stations, and starships anywhere in the known galaxy as long as they are similarly equipped.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "COMMUNICATIONS SUPPRESSOR, PREMIUM",
    description: "This modication adds a device designed to suppress the communications of a planet, space station, or starship within 1 mile of your ship. As an action, a crew member can attempt suppress the target's communications by forcing them to succeed at a Wisdom saving throw (DC equal to 8 + your Charisma (Interfere) bonus). On a failure, the target's communications are suppressed, preventing any communication to or from external sources. On a success, they become immune to this feature for one day. Additionally, your ship is prociently equipped for Charisma (Interfere) checks. If your ship is already prociently equipped, it is instead considered expertly equipped.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "COMMUNICATIONS SUPPRESSOR, PROTOYPE",
    description: "This modification improves the communications suppressor by adding a decrypter. Your crew has advantage on Intelligence checks to decrypt messages. Additionally, your ship is expertly equipped for Charisma (Interfere) checks.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "COMMUNICATIONS SUPPRESSOR, RENOWNED",
    description: "This modification massively improves the suppressor on your ship. When a crew member attempts to decrypt a message, they have advantage on the roll. Additionally, when a crew member attempts to suppress or decrypt, if they already have advantage on the roll, they can instead reroll one of the dice once",
    baseCost: 3500,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Operation system",
    name: "ELECTRONIC BAFFLE",
    description: "When your ship would become ionized, shocked, or stunned, a crew member can use their reaction to roll one hull die and suffer damage to the hull equal to the amount rolled in order to ignore the triggering condition. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship undergoes reffitting",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "EMP DEVICE",
    description: "This modification adds a reusable EMP device to disable nearby electronics. As an action, a crew member can activate the device. Each ship, within 100 feet must make a Constitution saving throw (DC = 8 + the crew member's proficiency bonus + the ship's Strength modifier). On a failed save, a ship is stunned for 1 minute. As an action on each of the ship's turns, a crew member can have the ship repeat the saving throw, ending the effect on a success. Your ship automatically fails the initial saving throw, but has advantage on subsequent saving throws against this effect. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "Electrical Dischargers",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "FLIGHT COMPUTER",
    description: "This system allows one crew member to take the Dash, Evade, or Regenerate Shield action as a bonus action on their turn.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Engineering System",
    name: "GRAVITY WELL PROJECTOR",
    description: "Your ship is modified with a gravity well projector that prevents ships from jumping to hyperspace, and even pulls ships from hyperspace, through use of an interdiction field. A crew member can activate or deactivate the gravity well projector as an action, which has a range of 1,000 feet and a limited firing arc, as described in Chapter 9. While active, this ship and ships of the same size or smaller that enter or start their turn within the gravity well projector's ring arc can't activate their hyperdrives. The effects of this feature last until the beginning of your next turn unless the crewmember uses a bonus action to maintain it. This feature can be used a number of times equal to your ship’s tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 15)",
    description: "Standard hyperdrive slot - class 15 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 8)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 8 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 5)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 5 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 4)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 4 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 3)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 3 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 2)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 2 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 1.5)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 1.5 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 1.0)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 1 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 0.75)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 0.75 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "HYPERDRIVE SLOT (Class 0.5)",
    description: "This modification adds a hyperdrive slot on your ship and includes a class 0.5 hyperdrive",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "NAVCOMPUTER",
    description: "This modification adds a navcomputer slot on your ship and includes a basic navcomputer. Your ship is proficiently equipped for Intelligence (Astrogation) checks. A crew member can use their bonus action to make their Intelligence (Astrogation) check, rather than their action. Your ship can still only make one check per round.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "NAVCOMPUTER, MARK II",
    description: "This modification improves the navcomputer on your ship. Your ship is expertly equipped for Intelligence (Astrogation) checks",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Navcomputer",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "NAVCOMPUTER, MARK III",
    description: "This modification further improves the navcomputer on your ship. You have a +1 bonus on Intelligence (Astrogation) checks.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Navcomputer, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "NAVCOMPUTER, MARK IV",
    description: "This modification greatly improves the navcomputer on your ship. You have a +2 (non-cumulative) bonus on Intelligence (Astrogation) checks.",
    baseCost: 3500,
    grade: "4",
    prerequisite: "Navcomputer, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Navcomputer",
    type: "Operation system",
    name: "NAVCOMPUTER, MARK V",
    description: "This modification massively improves the navcomputer on your ship. You have a +3 (non-cumulative) bonus on Intelligence (Astrogation) checks.",
    baseCost: 3500,
    grade: "5",
    prerequisite: "Navcomputer, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SCANNER, PREMIUM",
    description: "This system augments the native radar scanner on your ship. Your ship gains blindsight out to 1,000 feet. Additionally, your ship is proficiently equipped for Intelligence (Probe) and Wisdom (Scan) checks.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SCANNER, PROTOTYPE",
    description: "This modification improves the radar scanner on your ship. Your ship is expertly equipped for Intelligence (Probe) and Wisdom (Scan) checks",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SCANNER, RENOWNED",
    description: "This modification massively improves the radar scanner on your ship. Your ship gains truesight out to 1,000 feet. Your ship has advantage on Intelligence (Probe) and Wisdom (Scan) checks that rely on scanners.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "SECONDARY TRANSPONDER CODE",
    description: "This modification implements a secondary transponder code into your ship's sublight engines. This transponder code can differ from your primary transponder code in terms of ship's owner, designation, make and model, any registered modifications, and the ship's ownership history. A crew member can switch the ship's transponder code as an action. A creature can determine this transponder code is a fake by making an Intelligence (Technology) check (DC = 8 + your ship's bonus to Charisma (Swindle) checks). On a success, they determine that your transponder code is a fake. Additionally, your ship is proficiently equipped for Charisma (Swindle) checks. If your ship is already proficiently equipped, it is instead considered expertly equipped.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SENSOR DAMPENER",
    description: "This modification adds a remote sensor dampener to your ship. As an action, a crew member can attempt to dampen the sensors of a ship they can see within 1,000 feet. The target makes a Wisdom saving throw (DC = 8 + your Charisma (Interfere) bonus. On a failed save, the ship is blinded for 1 minute. As an action on each of the ship's turns, a crew member on the affected ship can repeat this save, ending the effect on a success. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges. Additionally, your ship is proficiently equipped forDexterity (Hide) checks. If your ship is already proficiently equipped, it is instead considered expertly equipped.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SHIELD DISRUPTOR",
    description: "This modification adds a shield disruptor to a ship, which is used to interfere with another ship's shield. As an action, a crew member can activate the shield disruptor and choose a ship they can see within 1,000 feet. You make a Charisma (Interfere) check contested by the target's Constitution (Regulate) check. On a failed save, the ship's shield capacity and shield regeneration rate are reduced by half for 1 minute. If the ship's current shield points would exceed the new shield capacity, they are reduced accordingly. At the start of each of the target ship's turns, a crew member can use an action to repeat the saving throw, ending the effect on a success. If a ship is targeted by a larger ship, it has disadvantage on the saving throw. If targeted by a smaller ship, it instead has advantage. You can end the shield disruptor at any time (no action required). This feature can be used a number of times equal to your ship's tier. All expended uses are regained whenthe ship recharges.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "STEALTH DEVICE",
    description: "This modication adds a stealth device to your ship. This device effectively counteracts or negates the use of scanners, both for and against your ship. A crew member can activate or deactivate a stealth mode as an action. While active, your ship has advantage on Dexterty (Hide) checks that rely on scanners, but your ship has disadvantage on Intelligence (Probe) and Wisdom (Scan) checks that rely on scanners. Additionally, if you try to enter hyperspace while the cloaking device is active, you must roll on the Hyperspace Mishaps table on page 76. Finally, your ship is proficiently equipped for Dexterity (Hide) checks. If your ship is already proficiently equipped, it is instead considered expertly equipped.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "SUPER-HEAVY ION CANNON",
    description: "Your ship is equipped with a weapon designed to disable enemy ships without damaging them through use of a specialized ion cannon that delivers a powerful electromagnetic burst. A crew member can fire the super-heavy ion cannon at a target as an action, which has a range of 1,000 feet and a limited ring arc, as described in Chapter 9. The target must make a Constitution saving throw (DC = 8 + the crew member's proficiency bonus + the ship's Strength modier). On a failed save, a ship is stunned for 1 minute. As an action on each of the ship's turns, a crew member can repeat the saving throw, ending the effect on a success. If a ship is targeted by a ship two or more sizes larger than them, it has disadvantage on the initial saving throw. If targeted by a ship two or more sizes smaller, it instead has advantage. This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: true
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "THREAT TRACKER",
    description: "You equip your ship with a specialized defensive computer system. When you would make a Dexterity saving throw, you can instead make a Wisdom saving throw. You can use this feature a number of times equal to your ship's Wisdom modifier. All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "Threatening Hardware",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Engineering System",
    name: "TRACTOR BEAM",
    description: "This modification adds a tractor beam to a ship, which can be used to grasp and guide vessels and debris. As an action, you can activate the tractor beam, which has a range of 1,000 feet and a limited firing arc, as described in Chapter 9. Each ship within the firing arc must make a Strength saving throw (DC = 8 + ship tier + the ship's Strength modier). On a failed save, a ship is tractored. As a bonus action, a player can move a tractored ship 100 feet in any direction. As an action, a pilot of a tractored ship can repeat the saving throw, ending the effect on a success. The saving throws are made with advantage if the target is larger than you, and with isadvantage if smaller. If you are attempting to tractor a ship larger than you, fail or success, you can choose to gain the tractored condition and move yourself instead. You can end the tractor beam at any time (no action required). This feature can be used a number of times equal to your ship's tier (a minimum of once). All expended uses are regained when the ship recharges.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "ARMORY",
    description: "This suite comes equipped with an amount of simple and martial blasters and vibroweapons, as well as light, medium, and heavy armor and shields, to outfit a force equal to twice the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. Additionally, it comes with a number of firing ranges to accommodate a number of troopers equal to one- fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "BARRACKS",
    description: "This suite offers a single room featuring a number of beds and individual storage, as well as communal refresher stations (one for every eight beds), to house a number of civilians, crew members, or troopers equal to twice the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "BOARDING PODS",
    description: "This suite adds boarding pods to your ship. Boarding pods are designed to be fired at a ship, burrow into the ship's hull, and inject host droids to overcome the target ship. Each boarding pod can support ten Medium or smaller droids. The quantity of boarding pods is equal to one-hundredth of the ship's suite capacity, as shown in the Starship Size Suite Capacity table. Boarding pods are Small size and have a flying speed of 200 feet, a turning speed of 100 feet, an AC of 12, and 10 hull points. Boarding pods do not have weapons, but the pilot can take the Ram action. The DC for the saving throw is 12, and the target has disadvantage. On a failure, the ship takes 2d4 kinetic damage, and the pod burrows into the ship's hull, releasing its contents on the target ship.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "CASINO",
    description: "This suite offers all of the necessary implements, including furniture and customized chips, to run a gambling institution. In order to operate, the casino requires a number of crew members, equal to one- tenth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. A casino can comfortably host a number of guests equal to half the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. At the end of each gaming day, the GM can roll a d20 to determine whether and how much the casino makes or loses money. The amount the casino makes or loses depends on the ship's size: See pg 66 in SotG.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "COMMAND CENTER",
    description: "This suite creates a separate command center designed to give a comprehensive view of the area surrounding the ship. When a crew member deployed in a command center takes the Direct action, they can target an additional ally. This ability can only be used once per ship turn.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "CREW EXPANSION",
    description: "You integrate an additional seating arrangement in your ship. Your ship's maximum crew capacity increases by 1",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Small",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "DOCKING BAY",
    description: "This suite comes equipped with an integrated mechanic's kit and has space for all of the necessary equipment to launch, receive, repair, rearm, and house another starship. The size it can house varies depending on the ship's size. Medium: A Medium docking bay can house one Tiny ship. Large: A Large docking bay can house two Medium ships. Huge: A Huge docking bay can house one Large ship. Gargantuan: A Gargantuan docking bay can house one Huge ship. Alternatively, this suite can house multiple ships of smaller size. A Huge ship takes up the space of 10 Large ships, which in turn takes up the place of 10 Medium ships. One Medium ship takes up the space of ve Small ships, which in turn takes up the space of two Tiny ships. You can also replace a ship with a droid or construct of four size categories larger. Up to two docking bays can be combined to combine their storage capacity. Over the course of 1 minute, a pilot can launch or dock in the docking bay.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "DOCKING BAY, RAPID LAUNCH",
    description: "This suite has space for all of the necessary equipment to launch and house other starships. The amount it can house varies depending on the ship's size. Large: A Large rapid launch bay can house ve small ships. Huge: A Huge rapid launch bay can house ve Medium ships. Gargantuan: A Gargantuan rapid launch bay can house ve Large ships. Alternatively, this suite can house multiple ships of smaller size. A Large ship takes up the space of 10 Medium ships, which in turn takes up the place of ve Small ships, which in turn takes up the space of two Tiny ships. You can also replace a ship with a droid or construct of four size categories larger. A pilot present in their ship can launch their ship from the rapid launch bay as an action. A launched ship cannot be received by a rapid launch bay, and must instead be received in a docking bay of the same ship.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Large or larger, Docking Bay",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "DROID STORAGE",
    description: "This suite offers a single room featuring tightly-packed racks suitable for storing and housing a number of Medium droids equal to four times the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. Alternatively, this suite can house droids of other sizes. A Huge droid takes up the space of two Large droids, which in turn takes up the place of two Medium droids, and so on.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "ESCAPE PODS",
    description: "This suite adds escape pods to your ship. Each escape pod comes equipped with emergency rations and supplies that can support four civilians, crew members, or troopers for 1 week, in both hot and cold climates, as described in chapter 5 of the Dungeon Master's Guide. The quantity of escape pods is equal to one- fourth the ship's suite capacity, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "ESCAPE PODS, HYPERSPACE CAPABLE",
    description: "This suite adds escape pods to your ship. Each escape pod comes equipped with a Class 15 hyperdrive, emergency rations and supplies that can support four civilians, crew members, or troopers for 1 week, in both hot and cold climates, as described in chapter 5 of the Dungeon Master's Guide. The quantity of escape pods is equal to one-fourth the ship's suite capacity, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "3",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "EQUIPMENT ROOM",
    description: "This suite adds an equipment room, adding 4 modication slots to your base modication capacity",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "EXTERNAL DOCKING SYSTEM",
    description: "Your ship is equipped with an airlock and couplers designed to attach and connect to one or more ships of a size category smaller as described below. As an action, a crew member can engage or disengage the external docking system. While a ship is coupled to your ship, the ships can share primary systems as appropriate, and creatures can transfer between ships readily. While an external docking system is occupied by at least one ship, your ship’s flying speed decreases by 50 feet (to a minimum of 50 feet), its turning speed increases by 50 feet, and its hyperdrive is considered one class greater (to a maximum of Class 20) for determining travel time in hyperspace. Alternatively, this suite can accommodate multiple ships of smaller size. A Huge ship takes up the space of 10 Large ships, which in turn takes up the place of 10 Medium ships. One Medium ship takes up the space of five Small ships, which in turn take up the space of two Tiny ships. You can also replace a ship with a droid or construct of four size categories larger.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Cargo",
    type: "Suite system",
    name: "FUEL STORAGE",
    description: "This large fuel tank is able to store additional fuel portions in your starship. The tank stores fuel units equal to 5 times your ship's normal fuel capacity. These units can be used to fuel your own starship, or they can be transfered to other ships. Fuel can be transferred to ships of other size. A Gargantuan fuel unit takes up the space of 10 Huge units, which in turn takes up the space of 10 Large units, which takes the space of 10 Medium units. One Medium ship takes up the space of two Small units, which in turn takes up the space of two Tiny units.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Cargo",
    type: "Suite system",
    name: "HIDDEN STORAGE",
    description: "This suite comes equipped with hidden storage compartments, which have a capacity equal to half your ship's base cargo capacity, as shown in the Starship Size Cargo Capacity table on page 55. Finding the hidden storage compartments requires a successful DC 20 Intelligence (Investigation) or Wisdom (Perception) check, which is made with disadvantage.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "HOLDING CELLS",
    description: "This suite includes a security post and a number of individual holding cells, as shown in the Starship Size Suite Capacity table, equipped with both a key and a code lock. Holding cell doors are magnetically sealed to prevent them opening in the event of power failure.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "HYDROPONICS GARDEN",
    description: "This suite grows plants for either consumption or commerce. If the Garden is configured for consumption, every day it produces common food in an amount capable of supporting a number of civilians, crew members, or troopers equal to one-tenth the ship's suite capacity, as shown in the Starship Size Food Capacity table. If the Garden is configured for commerce, at the end of every month (7 weeks of 5 days) it produces plant goods with a market value in Credits of 10 times the ship's suite capacity, as shown in the Starship Size Food Capacity table. In some cases, a GM may determine that this value could be increased if a particularly rare plant good is produced. In such cases, the players may need to procure rare starter material such as seeds or cuttings to start or continue production.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "INTERROGATION CHAMBER",
    description: "This suite includes all of the necessary implements and apparatuses necessary to interrogate, or even torture, a number of prisoners equal to half the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. When interrogating a prisoner, the interrogator has advantage on Charisma (Intimidation) and Charisma (Persuasion) checks. If they spend at least an hour interrogating a prisoner, the prisoner has disadvantage on Charisma (Deception) checks",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "INVESTIGATION SUITE",
    description: "This suite includes an integrated disguise kit, forgery kit, security kit, and slicer's kit. While utilizing any of these tools, you can add your prociency bonus to checks you make if you do not already do so. If you already add your prociency bonus to checks you make, you instead add double your prociency bonus. If you already double your prociency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modier. Additionally, while utilizing any of these tools, you have advantage on ability checks you make with them. If you already have advantage on the ability check, you can instead reroll one of the dice once.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "KENNEL",
    description: "This suite comes with all of the proper equipment to house beasts. When making Animal Handling checks on your ship, you can add your prociency bonus to checks you make if you do not already do so. If you already add your prociency bonus to checks you make, you instead add double your prociency bonus. If you already double your proficiency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, this suite can house a number of medium beasts equal to half of the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. Alternatively, this suite can house beasts of other sizes. A Huge beast takes up the space of two Large beasts, which in turn takes up the place of two Medium beasts, and so on.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "LABORATORY",
    description: "This suite comes equipped with a complete biochemist's kit, herbalism kit, and poisoner's kit integrated. While utilizing any of these tools, you can add your proficiency bonus to checks you make if you do not already do so. If you already add your proficiency bonus to checks you make, you instead add double your proficiency bonus. If you already double your proficiency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, while utilizing any of these tools, you gain a benefit based on which tools you are using. Biochemist's kit: Over the course of a long rest, you can temporarily improve the potency of one medpac. If the medpac is consumed before the end of your next long rest, when a creature uses this medpac, they take the maximum instead of rolling. Herbalism kit: Over the course of a long rest, you can remove one poison or disease from a friendly creature within reach. Poisoner's kit: Over the course of a long rest, you can temporarily improve the potency of one poison. If the poison is used before the end of your next long rest, its DC becomes 8 + your prociency bonus + your Intelligence modifier, and it deals extra poison damage equal to your Intelligence modifier.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "LIVING QUARTERS",
    description: "This suite features separate rooms to house a number of civilians, crew members, or troopers, determined by the ship's size, as well as communal refresher stations (one for every four rooms). Each room comes fully furnished. When a creature completes a long rest involving this suite, their exhaustion level is reduced by 2, instead of only 1.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "LUXURY QUARTERS",
    description: "This suit features separate rooms, which come fully furnished, with its own refresher station. When a creature completes a long rest involving this suite, they regain all spent Hit Dice, instead of only half of them, and their exhaustion level is reduced by 2, instead of only 1. This suite features a number of private quarters equal to half the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "MECHANIC'S SHOP",
    description: "This suite comes with all of the proper equipment to house droids and small constructs, complete with integrated astrotech's tools, a demolitions kit, and a mechanic's kit. While utilizing either of these tools, you can add your prociency bonus to checks you make if you do not already do so. If you already add your prociency bonus to checks you make, you instead add double your prociency bonus. If you already double your prociency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, while utilizing any of these tools, you gain a benefit based on which tools you are using. Demolitions kit: Over the course of a long rest, you can temporarily improve the potency of one grenade or mine. If the chosen explosive is used before the end of your next long rest, its DC becomes 8 + your proficiency bonus + your Intelligence modifier, and it deals extra damage equal to your Intelligence modifier. The damage is of the same type dealt by the chosen explosive. Mechanic's Kit: Whenever you make an Intelligence Mechanic's Kit) check to make a repair, you can treat a d20 roll of 9 or lower as a 10, as long as you spend at least ten minutes repairing it. Lastly, this suite can house droids and constructs, depending on the ship's size: Small: A Small mechanic's shop can house one Medium droid or construct. Medium: A Medium mechanic's shop can house one Huge droid or construct. Large: A Large mechanic's shop can house one Gargantuan droid or construct. Huge: A Huge mechanic's shop can house 10 Gargantuan droids or constructs. Gargantuan: A Gargantuan mechanic's shop can house 100 Gargantuan droids or constructs. Alternatively, this suite can house droids of other sizes. A Gargantuan droid takes up the space of two Huge droids, which in turn takes up the place of two Large droids, and so on.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "MEDBAY",
    description: "This suite comes with first aid supplies to support a number of civilians, crew members, or troopers, determined by the ship's size. Additionally, this suite comes equipped as follows, depending on the ship's size: Small: One biobed.  Medium: Two biobeds.Large: 10 biobeds and four bacta tanks. Huge: 100 biobeds and 40 bacta tanks. Gargantuan: 100 biobeds and 400 bacta tanks. For every one hour spent in a bacta tank or biobed, a creature's exhaustion level is reduced by 1, and it can roll a Hit Die to recovery hit points without expending the die. Additionally, if a creature has been dead for less than 1 hour before being put in a bacta tank. It can be revitalized over a 6-hour period. At the end of the 6 hours, the creature recovers 1 hit point, all mortal wounds close, and the creature can now recover hit points and reduce exhaustion as described above. The revitalized creature takes a -4 penalty to all ability checks, attack rolls, and saving throws. Every time the creature finishes a long rest, the penalty is reduced by 1 until it disappears. This feature has no effect on droids or constructs. Once this feature has been used,it can't be used again until the ship undergoes refitting.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "MEDITATION CHAMBER",
    description: "This suite comes with a number of separate unique chambers equal to one-fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. When a forcecaster completes a long rest involving this suite, they gain temporary force points equal to their force power maximum power level + their Wisdom or Charisma modifier (their choice, minimum of one). When you would spend a force point while you have temporary force points, the temporary force points are spent rst. All temporary force points are lost at the end of your next long rest.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "MESS HALL",
    description: "This suite comes with a combined kitchen and dining area, complete with a chef's kit, that can accommodate a number of civilians, crew members, or troopers equal to twice the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. While utilizing this tool, you can add your proficiency bonus to checks you make if you do not already do so. If you already add your proficiency bonus to checks you make, you instead add double your prociency bonus. If you already double your prociency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, when a creature completes a long rest involving this suite, they regain two additional Hit Dice and have advantage on Constitution saving throws against disease for the next 24 hours.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "RECREATION",
    description: "This suite comes with a bar and lounge area, as well as multiples of each gaming set and musical instrument, and can accommodate a number of civilians, crew members, or troopers equal to twice the twice the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. While utilizing any of these tools, you can add your prociency bonus to checks you make if you do not already do so. If you already add your prociency bonus to checks you make, you instead add double your prociency bonus. If you already double your prociency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, while utilizing any of these tools, you gain a benefit based on which tools you are using. Gaming set or musical instrument: While playing one of the gaming sets or musical instruments, you can always readily read the emotions of those paying attention to you. During this time, and for up to one minute after completing, you have advantage on Wisdom (Insight) checks to read the emotions of those you performed for or competed against. Lastly, when a creature completes a long rest involving this suite, they gain advantage on the first ability check or attack roll they make before the start of their next long rest.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "REMOTE CONTROL CONSOLE",
    description: "This suite includes the proper equipment necessary for a crew member to take remote control of another ship from the safety of their own ship. A number of crew members can be deployed at a time in remote ships from this suite equal to one quarter of the ship’s suite capacity by size, as shown in the Starship Size Suite Capacity table. The distance at which this suite can connect to remote ships is limited by the communications of the ship this suite is installed in.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "SECURITY SUITE",
    description: "This suite comes equipped with a full base of security for your ship, including secured storage, a brig, and a compact armory. The secured storage can hold an amount equal to one- tenth the ship's base cargo capacity, as shown in the Starship Size Cargo Capacity. The secured storage is equipped with both a key and a code lock, and is magnetically sealed to prevent it opening in the event of power failure. The secured storage can be accessed with a DC 20 Intelligence (Security Kit) check. The brig can host a number of prisoners equal to one- fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. The armory comes equipped with an amount of simple blasters and vibroweapons, as well as light armor and shields, to outfit a force equal to one-fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "SLAVE PENS",
    description: "This suite offers a single room, equipped with both a key and a code lock, that can house a number of prisoners equal to twice the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. Slave pen doors are magnetically sealed to prevent them opening in the event of power failure. When a creature completes a long rest involving this suite, their exhaustion level is not reduced. Additionally, for each week spent in this suite, creatures suffer 1 level of exhaustion.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Cargo",
    type: "Suite system",
    name: "STORAGE COMPARTMENT",
    description: "This suite increases the cargo capacity on your ship by its base cargo capacity, as shown in the Starship Size Cargo Capacity on page 55.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "SUPERCHARGER STATION",
    description: "This suite comes with a number of separate unique stations equal to one-fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. When a techcaster completes a long rest involving this suite, as long as they have their techcasting focus, they gain temporary tech points equal to their tech power maximum power level + their Intelligence modier (minimum of one). When you would spend a tech point while you have temporary tech points, the temporary tech points are spent first. All temporary tech points are lost at the end of your next long rest.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "TRANSPORTATION",
    description: "This suite offers a single room, or series of rooms, typically located near the cockpit, featuring a number of seats and individual storage, as well as communal refresher stations (one for every 16 seats), to transport a number of civilians, crew members, or troopers equal to four times the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Cargo",
    type: "Suite system",
    name: "VAULT",
    description: "This suite comes equipped with a vault, which has a capacity equal to half your ship's base cargo capacity, as shown in the Starship Size Cargo Capacity table on page 55. The vault is equipped with both a key and a code lock, and is magnetically sealed to prevent it opening in the event of power failure. The vault can be accessed with a DC 25 Intelligence (Security Kit) check. When the vault is accessed, an alarm sounds in the Bridge and Security Suite (if it exists). If a player rolls a 30 or higher on the Intelligence (Security Kit) check to unlock the vault, or has the key or code, the alarm can be bypassed.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Suite",
    type: "Suite system",
    name: "WORKSHOP",
    description: "This suite offers a number of crafting stations that can accomodate up to one-fourth the ship's suite capacity by size, as shown in the Starship Size Suite Capacity table. The crafting stations are equipped with each set of artisan's tools integrated. While crafting at the crafting station, you can add your proficiency bonus to checks you make if you do not already do so. If you already add your proficiency bonus to checks you make, you instead add double your proficiency bonus. If you already double your proficiency bonus to checks you make, you instead add half of your governing ability modifier (rounded down, minimum of +1), in addition to your ability modifier. Additionally, while crafting at a crafting station, the total market value you can craft per day increases by an amount of credits equal to 5 x your character level. If you add double your prociency bonus to checks you make with them, the market value increases by 10 x your character level.",
    baseCost: 5000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "ABLATIVE PLATING LAYER",
    description: "You add an ablative coating to your hull, granting your hull resistance to energy damage.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "ABSORPTIVE SHIELDING",
    description: "You add an absorbtive capacitor to your shield generator, granting your shields resistance to kinetic damage.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "ADAPTIVE AILERONS",
    description: "While you are in atmosphere, this modication reduces your turn speed by 100 feet (min. 50 feet) and grants you a +1 bonus to AC and Dexterity saving throws.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "AMPHIBIOUS SYSTEMS",
    description: "This modication allows your ship and all of its systems (including weapons) to function underwater. Your ship gains a swimming speed equal to half of its normal speed.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "ANTI-BOARDING SYSTEM",
    description: "An anti-boarding system is a robust series of blast doors, cameras, and hidden turrets, reinforcing each portal throughout the ship, as well as directly outside each ship entrance. These features are controllable from the cockpit or in the Security Suite (if it exists) by a crew member. The anti-boarding system comes with its own power backup in case of main system failure. The reinforced doors can be bypassed with a DC 20 Intelligence (Security Kit) check.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MAKESHIFT",
    description: "You install a central computer, complete with artificial intelligence, in your ship. Your ship gains the ability to take one action of its own on it's turn. It can take any action granted by a modification. The artificial intelligence has a proficiency bonus of +2. Additionally, your ship is proficiently equipped for Intelligence (Data) checks.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "Ship size Small or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MARK I",
    description: "You improve your ship's central computer. Your ship can now take bonus actions granted by modifications. Additionally, your ship can now take any standard action except the attack action and pilot-only actions.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "Central Computer, Makeshift",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MARK II",
    description: "You further improve your ship's central computer. Your artificial intelligence's proficiency bonus increases to 3. Additionally, your ship can now take reactions granted by modifications and can take the attack action with ship weapons. It is still limited to one action per turn.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Central Computer, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MARK III",
    description: "You greatly improve your ship's central computer. Your articial intelligence's proficiency bonus increases to 4. Additionally, your artificial intelligence gains proficiency in Piloting and can take pilot-only actions if deployed as the pilot.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Central Computer, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MARK IV",
    description: "You massively improve your ship's central computer. Your artificial intelligence's proficiency bonus increases to 5. Additionally, when your artificial intelligence takes the Interfere action, it has advantage on the Intelligence (Interfere) check.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Central Computer, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CENTRAL COMPUTER, MARK V",
    description: "You ship's central computer has reached its maximum potential. Your artificial intelligence's proficiency bonus increases to 6. Additionally, it gains expertise in Piloting",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Central Computer, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "CRYOGENIC CAPACITOR",
    description: "You install high-efficiency reserve power cells giving your ship the ability to better meet peak power demands. Your ship is proficiently equipped for Strength (Boost) checks.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "CRYOGENIC CAPACITOR, PREMIUM",
    description: "You improve your ship's reserve power cells. Your ship is expertly equipped for Strength (Boost) checks.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MAKESHIFT",
    description: "You improve your ship's Data Core, at a cost. Your ship's Intelligence score increases by 1. One ability score other than Intelligence (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Intelligence score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MARK I",
    description: "You improve your ship's Data Core. Your ship's Intelligence score increases by 1. As normal, you can't increase your ship's Intelligence score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MARK II",
    description: "You further improve your ship's Data Core. Your ship's Intelligence score increases by 1. As normal, you can't increase your ship's Intelligence score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Data Core, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MARK III",
    description: "You greatly improve your ship's Data Core. Your ship's Intelligence score increases by 1. As normal, you can't increase your ship's Intelligence score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Data Core, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MARK IV",
    description: "You massively improve your ship's Data Core. Your ship's Intelligence score increases by 1. As normal, you can't increase your ship's Intelligence score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Data Core, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DATA CORE, MARK V",
    description: "Your ship's Data Core has reached it's maximum potential. Your ship's Intelligence score increases by 2. Your ship's maximum for this score increases by 2",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Data Core, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MAKESHIFT",
    description: "You install a droid brain that can singularly control your starship. Your starship's maximum and minimum crew requirement become 0, and your starship cannot benefit from features that would increase or decrease it's crew capacity. The droid brain controls all aspects of the ship, instead. The droid brain has a proficiency bonus of +2, and proficiency in Piloting. In combat, the droid brain rolls its own initiative, to which it gains no bonus.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "Ship size Medium or smaller",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MARK I",
    description: "You improve your ship's droid brain. If your ship is Small or Medium, the number of actions it can take each turn increases: Small: A Small ship can take a number of actions equal to half its proficiency bonus (rounded up). Medium: A Medium ship can take a number of actions equal to its proficiency bonus.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "Droid Brain, Makeshift",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MARK II",
    description: "You further improve your ship's droid brain. Your droid brain's proficiency bonus increases to 3. Additionally, your ship's droid brain has advantage on initiative rolls.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Droid Brain, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MARK III",
    description: "You greatly improve your ship's droid brain. Your droid brain's proficiency bonus increases to 4. Additionally, it gains a rank in a Deployment of your choice.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Droid Brain, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MARK IV",
    description: "You massively improve your ship's droid brain. Your droid brain's proficiency bonus increases to 5. Additionally, your droid brain has expertise in Piloting.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Droid Brain, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "DROID BRAIN, MARK V",
    description: "Your ship's droid brain has reached its maximum potential. Your droid brain's proficiency bonus increases to 6. Additionally, it gains a rank in a Deployment of your choice.",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Droid Brain, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "EJECTION POD",
    description: "You integrate an ejection seat and pod in your ship. When your ship is reduced to 0 hull points but not destroyed outright, you can use your reaction to eject the pod from the ship. The pod includes emergency rations and supplies that can support one creature for 1 day, in both hot and cold climates, as described in chapter 5 of the Dungeon Master's Guide. The pod is Tiny size and has a flying speed of 150 feet, a turning speed of 50 feet, an AC of 10, and 5 hull points. The pod includes one unit of fuel.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "Ship size Small",
    requiresTargetWeapon: false
  },
  {
    system: "Cargo",
    type: "Universal system",
    name: "EXTRA FUEL TANK",
    description: "This tank adds fuel capacity to your ship equal to half of your ship's normal fuel capacity",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME",
    description: "Standard Frame",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MAKESHIFT",
    description: "You improve your ship's Frame, at a cost. Your ship's Constitution score increases by 1. One ability score other than Constitution (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Constitution score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MARK I",
    description: "You improve your ship's reactor. Your ship's Constitution score increases by 1. As normal, you can't increase your ship's Constitution score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MARK II",
    description: "You further improve your ship's Frame. Your ship's Constitution score increases by 1. As normal, you can't increase your ship's Constitution score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Frame, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MARK III",
    description: "You greatly improve your ship's Frame. Your ship's Constitution score increases by 1. As normal, you can't increase your ship's Constitution score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Frame, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MARK IV",
    description: "You massively improve your ship's Frame. Your ship's Constitution score increases by 1. As normal, you can't increase your ship's Constitution score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Frame, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "FRAME, MARK V",
    description: "Your ship's Frame has reached it's maximum potential. Your ship's Constitution score increases by 2. Your ship's maximum for this score increases by 2",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Frame, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "IMPROVED EMERGENCY BACKUP",
    description: "This system augments your ship's primary system emergency backup. This back up can now continue running the starship, provided there is adequate fuel, for 7 days.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Engineering System",
    name: "INERTIAL DAMPENERS",
    description: "This system lessens the transfer of external impacts into the ship's interior. When you are forced to make a Concentration check due to damage, impacts, or explosions exterior to the ship, you have advantage. Additionally, when you take the Evade action, skill checks and attack rolls made by your ship or anyone on it do not suffer from disadvantage from the evasion. Once this feature has been used, it can't be used again until the ship recharges.",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING",
    description: "Standard Plating",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MAKESHIFT",
    description: "You install armor plating. Your ship's Armor Class is now 11 + Dexterity modier + any additional bonuses",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MARK I",
    description: "You improve your ship's plating. Your ship's Armor Class is now 12 + Dexterity modifier + any additional bonuses.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MARK II",
    description: "You further improve your ship's plating. Your ship's Armor Class is now 14 + Dexterity modier (maximum of +2) + any additional bonuses",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MARK III",
    description: "You greatly improve your ship's plating. Your ship's Armor Class is now 15 + Dexterity modier (maximum of +2) + any additional bonuses.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MARK IV",
    description: "You massively improve your ship's plating. Your ship's Armor Class is now 17 + any additional bonuses",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "PLATING, MARK V",
    description: "Your ship's plating has reached it's maximum potential. Your ship's Armor Class is now 18 + any additional bonuses.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "POWER CONVERTER, PREMIUM",
    description: "You improve your ship's power converters. Your ship is prociently equipped for Constitution (Regulation) checks.",
    baseCost: 3500,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "POWER CONVERTER, PROTOTYPE",
    description: "You further improve your ship's power converters. Your ship is expertly equipped for Constitution (Regulation) checks.",
    baseCost: 3500,
    grade: "2",
    prerequisite: "Power Converter, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "REACTIVE PLATING LAYER",
    description: "You add a reactive layer to your ship's hull granting your hull resistance to kinetic damage.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "REACTIVE SHIELDING COMPENSATOR",
    description: "You add a reactive compensator to your ship's shield generator granting your shields resistance to energy damage.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "REACTOR",
    description: "Standard Reactor",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MAKESHIFT",
    description: "You improve your ship's reactor, at a cost. Your ship's Strength score increases by 1. One ability score other than Strength (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Strength score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MARK I",
    description: "You improve your ship's reactor. Your ship's Strength score increases by 1. As normal, you can't increase your ship's Strength score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MARK II",
    description: "You further improve your ship's reactor. Your ship's Strength score increases by 1. As normal, you can't increase your ship's Strength score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Reactor, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MARK III",
    description: "You greatly improve your ship's reactor. Your ship's Strength score increases by 1. As normal, you can't increase your ship's Strength score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Reactor, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MARK IV",
    description: "You massively improve your ship's reactor. Your ship's Strength score increases by 1. As normal, you can't increase your ship's Strength score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Reactor, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "REACTOR, MARK V",
    description: "Your ship's reactor has reached it's maximum potential. Your ship's Strength score increases by 2. Your ship's maximum for this score increases by 2",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Reactor, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MAKESHIFT",
    description: "You install a remote override that can allow your ship to be controlled from afar, provided the controller has access to a console and transmitter to control the ship from. If proper credentials are not supplied, a successful Intelligence (Slicer Kit) check (DC = 10 + the ship's Tier + the ship's Intelligence Modier) is required to control the ship. If the ship is currently controlled by another party, the check is made with disadvantage. Your ship’s maximum and minimum crew requirement become 1: the remote controller. Your starship cannot benefit from features that would increase or decrease its crew capacity. The controller instead controls all aspects of the ship, as if they were deployed inside of it. The starship has disadvantage on attack rolls and ability checks while being remote controlled. This ship can be controlled remotely from a distance of 10,000 feet. Lastly, if an effect would suppress communications for the ship, it cannot be controlled remotely for the duration of that suppression.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "Ship size Small or smaller",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MARK I",
    description: "The ship no longer suers from disadvantage on attack rolls and ability checks while being remote controlled",
    baseCost: 4000,
    grade: "1",
    prerequisite: "Remote Override, Makeshift",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MARK II",
    description: "This modification allows the ship it is installed in to be remotely controlled from anywhere in the system by a properly equipped controller",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Remote Override, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MARK III",
    description: "Additionally, your starship’s maximum crew requirement becomes 2, and can support 2 remote controllers.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Remote Override, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MARK IV",
    description: "Your starship’s maximum crew requirement becomes 3, and can support 3 remote controllers. Additionally, your ship can be remotely controlled from anywhere in the sector by a properly equipped controller.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Remote Override, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "REMOTE OVERRIDE, MARK V",
    description: "This modication allows the ship it is installed in to be remotely controlled from anywhere in the known galaxy by a properly equipped controller.",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Remote Override, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "RESILIENT Communications",
    description: "You overhaul your ship's communications systems to make them more adaptive. Your ship is proficiently equipped for Charisma saving throws.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Defense",
    type: "Universal system",
    name: "RESILIENT HULL",
    description: "You overhaul your ship's hull to make it more adaptive. Your ship is proficiently equipped for Constitution saving throws.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "RESILIENT PROCESSORS",
    description: "You overhaul your ship's computer to make it more adaptive. Your ship is proficiently equipped for Intelligence saving throws.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "RESILIENT SENSORS",
    description: "You overhaul your ship's sensors to make them more adaptive. Your ship is proficiently equipped for Wisdom saving throws",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Engineering System",
    name: "RESILIENT REACTOR",
    description: "You overhaul your ship's reactor to make it more adaptive. Your ship is proficiently equipped for Strength saving throws.",
    baseCost: 3500,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "RESILIENT THRUSTER",
    description: "You overhaul your ship's thruster to make it more adaptive. Your ship is proficiently equipped for Dexterity saving throws.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Operation system",
    name: "SENSOR ARRAY",
    description: "Standard Sensors",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MAKESHIFT",
    description: "You improve your ship's Sensor Array, at a cost. Your ship's Wisdom score increases by 1. One ability score other than Wisdom (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Wisdom score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MARK I",
    description: "You improve your ship's Sensor Array. Your ship's Wisdom score increases by 1. As normal, you can't increase your ship's Wisdom score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MARK II",
    description: "You further improve your ship's Sensor Array. Your ship's Wisdom score increases by 1. As normal, you can't increase your ship's Wisdom score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Sensor Array, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MARK III",
    description: "You greatly improve your ship's Sensor Array. Your ship's Wisdom score increases by 1. As normal, you can't increase your ship's Wisdom score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Sensor Array, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MARK IV",
    description: "You massively improve your ship's Sensor Array. Your ship's Wisdom score increases by 1. As normal, you can't increase your ship's Wisdom score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Sensor Array, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Sensors",
    type: "Universal system",
    name: "SENSOR ARRAY, MARK V",
    description: "Your ship's Sensor Array has reached it's maximum potential. Your ship's Wisdom score increases by 2. Your ship's maximum for this score increases by 2.",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Sensor Array, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "SLAVE CIRCUIT",
    description: "You install a slave circuit in your ship to improve automation. You reduce the minimum crew requirement by half.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Ship size Medium or larger",
    requiresTargetWeapon: false
  },
  {
    system: "Engineering",
    type: "Universal system",
    name: "SURGE PROTECTOR",
    description: "You augment your ship's preventative measures in order to mitigate damage to its systems. When refitting is conducted on your ship, its system damage level is reduced by 2, instead of only 1",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Operation system",
    name: "THRUSTERS",
    description: "Standard Thrusters for Sublight travel",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MAKESHIFT",
    description: "You improve your ship's thrusters, at a cost. Your ship's Dexterity score increases by 1. One ability score other than Dexterity (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Dexterity score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MARK I",
    description: "You improve your ship's thrusters. Your ship's Dexterity score increases by 1. As normal, you can't increase your ship's Dexterity score above the maximum for your size with this system",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MARK II",
    description: "You further improve your ship's Thrusters. Your ship's Dexterity score increases by 1. As normal, you can't increase your ship's Dexterity score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Thrusters, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MARK III",
    description: "You greatly improve your ship's Thrusters. Your ship's Dexterity score increases by 1. As normal, you can't increase your ship's Dexterity score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Thrusters, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MARK IV",
    description: "You massively improve your ship's Thrusters. Your ship's Dexterity score increases by 1. As normal, you can't increase your ship's Dexterity score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Thrusters, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Engines",
    type: "Universal system",
    name: "THRUSTERS, MARK V",
    description: "Your ship's Thrusters have reached it's maximum potential. Your ship's Dexterity score increases by 2. Your ship's maximum for this score increases by 2.",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Thrusters, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Operation system",
    name: "TRANSMITTERS",
    description: "Standard Transmitters",
    baseCost: 3500,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MAKESHIFT",
    description: "You improve your ship's Transmitters, at a cost. Your ship's Charisma score increases by 1. One ability score other than Charisma (chosen by the GM) decreases by 1. As normal, you can't increase your ship's Charisma score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MARK I",
    description: "You improve your ship's Transmitters. Your ship's Charisma score increases by 1. As normal, you can't increase your ship's Charisma score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "1",
    prerequisite: "None",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MARK II",
    description: "You further improve your ship's Transmitters. Your ship's Charisma score increases by 1. As normal, you can't increase your ship's Charisma score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "2",
    prerequisite: "Transmitters, Mk I",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MARK III",
    description: "You greatly improve your ship's Transmitters. Your ship's Charisma score increases by 1. As normal, you can't increase your ship's Charisma score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "3",
    prerequisite: "Transmitters, Mk II",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MARK IV",
    description: "You massively improve your ship's Transmitters. Your ship's Charisma score increases by 1. As normal, you can't increase your ship's Charisma score above the maximum for your size with this system.",
    baseCost: 4000,
    grade: "4",
    prerequisite: "Transmitters, Mk III",
    requiresTargetWeapon: false
  },
  {
    system: "Communications",
    type: "Universal system",
    name: "TRANSMITTERS, MARK V",
    description: "Your ship's Transmitters have reached their maximum potential. Your ship's Charisma score increases by 2. Your ship's maximum for this score increases by 2.",
    baseCost: 4000,
    grade: "5",
    prerequisite: "Transmitters, Mk IV",
    requiresTargetWeapon: false
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "BLINDING ROUNDS",
    description: "When you have advantage on the attack roll and hit, and the lower of the two d20 rolls would also hit, or when the target ship has disadvantage on the saving throw and fails, and the higher of the two rolls would also fail, you can force the target to make a Constitution saving throw (DC = 8 + your prociency bonus + the ship's Strength modier). On a failed save, the ship is blinded until the start of your next turn. If the damaged ship is larger than your ship, it has advantage on the saving throw. If the damaged ship is smaller than your ship, it instead has disadvantage.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Weapon that deals fire damage",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "BROADSIDE HARDPOINT",
    description: "The Broadside Hardpoint is a modication to two Fixed Hardpoints that grants an additional limited ring arc to each hardpoint, as described in chapter 9. The hardpoints must share at least 1 limited ring arc, and the two ring arcs of a hardpoint need not be adjacent. This modication installs a dedicated gunner station for each hardpoint. Attacks made utilizing the additional limited ring arc can only be made by a crew member deployed at the dedicated gunner station of the weapon.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Two Hardpoints",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "DIRECT CONTROLLER",
    description: "You have installed a dedicated gunner station at or about the hardpoint. A crew member deployed at this station can use their Dexterity modifier instead of the ship's Wisdom modifier for the attack rolls or save DCs of the chosen weapon.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Primary or Secondary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "EXPANDED PAYLOAD",
    description: "The reload value of the chosen weapon increases by half.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Tertiary or Quaternary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "EXPLOSIVE PAYLOAD",
    description: "When a ship fails a saving throw against the chosen weapon and another ship is within 50 feet of it, the second ship must also make the saving throw. On a failed save, the second ship takes damage equal to your ship's Strength modifier. The damage is of the same type dealt by the original attack.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Tertiary or Quaternary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "FIXED HARDPOINT",
    description: "A fixed hardpoint is used to mount a primary, secondary, tertiary, or quaternary weapon. A weapon mounted on a fixed hardpoint has a limited ring arc, as described in chapter 9 and can be fired from any crew station.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "FULL SALVO PROTOCOL",
    description: "Hardpoints having an additional limited or unlimited arc can now be fired remotely without suffering any disadvantage imposed by being remote from the dedicated gunner station.",
    baseCost: 3000,
    grade: "3",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "GAUSS ROUNDS",
    description: "When you roll a 1 or 2 on a damage die with the chosen weapon, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Primary or Secondary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "IONIZING ROUNDS",
    description: "When you score a critical hit with the chosen weapon; or when you have advantage on the attack roll and hit, and the lower of the two d20 rolls would also hit; or when the target ship rolls a 1 on the saving throw to avoid the weapon's effects; or when the target ship has disadvantage on the saving throw and fails, and the higher of the two rolls would also fail, you can force the target to make a Constitution saving throw (DC = 8 + your proficiency bonus + the ship's Strength modifier). On a failed save, the ship is ionized until the start of your next turn. If the damaged ship is larger than your ship, it has advantage on the saving throw. If the damaged ship is smaller than your ship, it instead has disadvantage.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Weapon that deals energy damage",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "PINPOINTING ADDITION",
    description: "The ranges of the chosen weapon of your choice increase by half.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "None",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "PINPOINTING ADDITION, PREMIUM",
    description: "The weapon's close range returns to its normal close range.",
    baseCost: 3000,
    grade: "1",
    prerequisite: "Primary or Secondary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "S-FOILS",
    description: "Your primary weapons are mounted to Strike Foils giving your ship variable operational capacities. As a bonus action, a crew member can switch between two modes: Locked: Your ship's speed increases by 50 feet and your primary weapons suffer a -2 penalty to attack rolls. Unlocked: Your ship's primary weapons gain a +1 bonus to attack rolls.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Ship size Medium or smaller, Primary Weapon",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "SHOCKING ROUNDS",
    description: "When you score a critical hit with the chosen weapon; or when you have advantage on the attack roll and hit, and the lower of the two d20 rolls would also hit; or when the target ship rolls a 1 on the saving throw to avoid the weapon's effects; or when the target ship has disadvantage on the saving throw and fails, and the higher of the two rolls would also fail, you can force the target to make a Constitution saving throw (DC = 8 + your proficiency bonus + the ship's Strength modifier). On a failed save, the ship is shocked until the start of your next turn. If the damaged ship is larger than your ship, it has advantage on the saving throw. If the damaged ship is smaller than your ship, it instead has disadvantage.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Weapon that deals kinetic damage",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "STUNNING ROUNDS",
    description: "When you score a critical hit with the chosen weapon; or when you have advantage on the attack roll and hit, and the lower of the two d20 rolls would also hit; or when the target ship rolls a 1 on the saving throw to avoid the weapon's effects; or when the target ship has disadvantage on the saving throw and fails, and the higher of the two rolls would also fail, you can force the target to make a Constitution saving throw (DC = 8 + your proficiency bonus + the ship's Strength modifier). On a failed save, the ship is stunned until the start of your next turn. If the damaged ship is larger than your ship, it has advantage on the saving throw. If the damaged ship is smaller than your ship, it instead has disadvantage.",
    baseCost: 3000,
    grade: "0",
    prerequisite: "Weapon that deals ion damage",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "TRIBUTARY BEAM",
    description: "This modification upgrades the Super-HeavyTurbolaser Battery, Capital Railgun, or Superweapon on your starship. The weapon deals an additional 1d10 damage.",
    baseCost: 3000,
    grade: "3",
    prerequisite: "Ship size Large or larger",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "TURRET HARDPOINT",
    description: "The Turret Hardpoint is a modification to a Fixed Hardpoint that grants an improved ring arc. The weapon attached to the chosen fixed hardpoint now has an unlimited ring arc in addition to its limited arc, as described in chapter 9. This hardpoint also installs a dedicated gunner station at or about the hardpoint. Attacks made utilizing the unlimited ring arc can only be made by a crew member deployed at the dedicated gunner station of the weapon.",
    baseCost: 3000,
    grade: "2",
    prerequisite: "Hardpoint",
    requiresTargetWeapon: true
  },
  {
    system: "Weapons",
    type: "Weapon Modification",
    name: "WEAPON SLAVE ARRAY",
    description: "A weapon slave array is attached to a hardpoint and used to fire the weapon from the cockpit or other crew station rather than from a dedicated gunner station at the hardpoint. A crew member deployed remote from a dedicated gunner station can now fire this weapon and utilize the additional limited or unlimited arc at disadvantage.",
    baseCost: 3000,
    grade: "1",
    prerequisite: "Hardpoint",
    requiresTargetWeapon: true
  },
];