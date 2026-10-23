// Every place's floors, planned by hand (Claude, 2026-10-23) so each floor has things that belong there and floors
// differ from each other, then laid out by rule and checked with placeErrors before src/data/places.json is written.
// Houses are furnished room by room (a kitchen gets a sink, cooker and fridge...) with a touch of each house style.
// Floor names, colours and hidden spots are kept; a floor too narrow for its plan is widened.
//
//   node tools/curate-floors.ts
//
// Spec per floor: template ids. "a*2" puts two; "a+b+c" stands b and c on a's top. Things whose items are wall things
// hang on the wall above short furniture; the rest stand on the floor, spread evenly.
import { writeFileSync } from 'node:fs';
import { FILES, load } from './kinds.ts';
import { placeErrors, WALL_HEIGHT, OUTDOOR_HEIGHT, type Floor, type Place, type Placed } from '../schemas/place.ts';
import { surfaceLevels } from '../schemas/shelf-stock.ts';
import type { Item } from '../schemas/item.ts';
import type { Template } from '../schemas/template.ts';
import type { PlanEntry } from '../schemas/plan.ts';
import { houseErrors, type House } from '../schemas/house.ts';

const SPEC: Record<string, string[][]> = {
  post_office: [
    ['post_counter+cute_gift_box', 'post_stamp_machine', 'parcel_shelf+parcel_pile', 'cute_parcel_belt', 'postcard_display_table+cute_gift_box', 'big_post_box', 'station_clock', 'cute_potted_plant'],
    ['cute_delivery_van', 'parcel_crane', 'big_post_box', 'parcel_pile', 'cute_post_box', 'flower_bed', 'cute_bird_feeder'],
  ],
  train_station: [
    ['ticket_booth', 'station_ticket_machine', 'station_bench', 'departure_board', 'station_clock', 'lost_found_basket', 'luggage_trolley', 'bus_stop_timetable', 'cute_potted_plant'],
    ['steam_train', 'station_bench', 'station_platform_sign', 'platform_clock', 'luggage_trolley', 'station_steam_whistle', 'cute_bird_feeder'],
    ['station_snack_cart', 'bus_stop_snack_machine', 'dining_table_set+pretzel+fizzy_drink', 'bar_stool*2', 'menu_board', 'station_clock', 'station_bench'],
  ],
  bus_station: [
    ['bus_stop_shelter', 'cute_stop_bus', 'bus_stop_sign', 'bus_stop_timetable', 'ticket_machine', 'round_tree_plant', 'garden_bench'],
    ['bus_shelter', 'bus_stop_snack_machine', 'station_bench', 'lost_found_basket', 'platform_clock', 'water_cooler', 'bus_stop_umbrella', 'cute_potted_plant'],
  ],
  kingdom_in_the_clouds: [
    ['crystal_castle', 'rainbow_arch', 'rainbow_cloud_bridge', 'cloud_bench', 'star_lantern', 'sky_flower', 'glitter_fountain', 'cotton_candy_tree'],
    ['cloud_throne', 'cloud_sofa', 'chandelier', 'gift_cabinet+rose_vase', 'tea_table+floating_cloud_teacup+moon_cookie', 'star_map', 'grand_piano', 'cloud_star_lamp'],
    ['cloud_castle', 'star_stepping_stones', 'moon_cloud_swing', 'cloud_swing', 'sky_flower', 'star_lantern', 'rainbow_slide', 'marshmallow_cloud', 'butterfly'],
  ],
  snowboarding_place: [
    ['snowboard_rack', 'cosy_fireplace', 'cosy_armchair', 'kitchen_table+cocoa_mug+hot_chocolate', 'wooden_chair', 'snowflake_lamp', 'snowboard', 'cute_snowboard', 'cozy_sled'],
    ['cute_ski_lift', 'ski_lift_chair', 'cozy_sled', 'cute_snowman', 'cute_snowball', 'snowboard_rack', 'cute_snowflake', 'cosy_igloo'],
    ['snow_castle', 'cosy_igloo', 'cute_snowman', 'cute_snowflake', 'cozy_sled', 'cute_snowball', 'garden_bench', 'star_lantern'],
  ],
  school: [
    ['garden_swing_set', 'tire_swing', 'basketball_hoop', 'jump_rope', 'classic_soccer_ball', 'garden_bench', 'round_tree_plant', 'sandcastle'],
    ['teacher_desk+desk_globe+book_stack', 'tall_open_bookcase', 'school_reading_nook', 'school_cozy_rug', 'school_lunchbox_shelf+cute_lunchbox', 'whiteboard', 'star_map', 'fire_extinguisher', 'water_cooler', 'cute_potted_plant'],
    ['school_desk+school_shopping_notebook', 'wooden_chair', 'school_desk+crayon_box', 'wooden_chair', 'blackboard', 'teacher_desk+globe_stand', 'school_easel_chalkboard', 'cube_storage_shelf', 'school_toy_blocks'],
  ],
  daycare: [
    ['baby_slide', 'garden_swing_set', 'toy_box', 'sandcastle', 'bucket_and_spade', 'cute_small_car', 'round_tree_plant', 'picnic_basket'],
    ['daycare_play_mat', 'daycare_soft_blocks', 'toy_kitchen', 'playpen', 'daycare_toy_piano', 'stuffed_bunny_daycare', 'cube_storage_shelf', 'daycare_picture_books', 'toy_box', 'daycare_floor_mobile'],
    ['daycare_baby_crib*2', 'daycare_changing_table+milk_bottle', 'daycare_high_chair', 'daycare_floor_mobile', 'rocking_chair', 'teddy_bear_toy', 'tea_table+daycare_snack_cup+night_lamp'],
  ],
  hospital: [
    ['reception_desk+hospital_flower_vase+first_aid_box', 'hospital_comfort_chair*2', 'water_cooler', 'wheelchair', 'station_clock', 'hospital_heart_balloon', 'cute_potted_plant'],
    ['hospital_bed', 'drip_stand', 'hospital_bedside_lamp', 'hospital_bed', 'hospital_comfort_chair', 'tea_table+hospital_juice_cup+hospital_snack_tray', 'hospital_toy_bear', 'walking_frame', 'hospital_bandage_box'],
    ['garden_bench', 'wheelchair', 'flower_bed', 'round_tree_plant', 'garden_fountain', 'bird_bath', 'cute_potted_plant', 'hospital_heart_balloon'],
  ],
  fire_station: [
    ['cute_fire_truck', 'fire_station_hose_reel', 'fire_hydrant', 'fire_station_helmet_stand', 'fire_station_ladder', 'traffic_cone', 'fire_extinguisher', 'fire_station_water_bucket'],
    ['kitchen_table+fire_station_treat_bowl+fire_station_radio', 'wooden_chair*2', 'cute_fridge', 'round_sofa', 'fire_pole', 'fire_station_pet_doghouse', 'sitting_puppy', 'fire_station_alarm_bell'],
    ['office_desk+desktop_computer+fire_station_radio', 'office_chair', 'fire_station_alarm_bell', 'fire_station_tool_cabinet', 'filing_cabinet', 'fire_extinguisher', 'whiteboard'],
  ],
  police_station: [
    ['police_car', 'traffic_cone*2', 'police_station_doghouse', 'police_station_dog_leash', 'sitting_puppy', 'garden_bench', 'police_patrol_car'],
    ['police_desk+desktop_computer+police_station_badge', 'office_chair', 'police_station_cosy_chair*2', 'water_cooler', 'filing_cabinet+police_magnifying_glass', 'whiteboard', 'cute_potted_plant'],
    ['police_station_doghouse', 'police_station_paw_mat', 'pet_bed', 'water_bowl', 'pet_food_bowl', 'leash_hook', 'bone_toy', 'sitting_puppy', 'police_station_dog_leash'],
  ],
  pools: [
    ['pool_water', 'diving_board', 'pool_ladder', 'pool_lounger*2', 'pool_sun_umbrella', 'inflatable_flamingo', 'pool_ring_float', 'pool_beach_ball', 'rubber_duck'],
    ['pool_drink_cart', 'dining_table_set+lemonade_glass+cute_ice_cream_cone', 'bar_stool*2', 'pool_towel_rack', 'menu_board', 'cute_fridge'],
    ['pool_water_slide', 'inflatable_flamingo', 'crab_toy', 'rubber_duck', 'beach_umbrella', 'pool_lounger', 'pool_ring_float', 'pool_noodle'],
  ],
  zoo: [
    ['tall_giraffe', 'baby_elephant', 'friendly_lion', 'wooden_fence*2', 'animal_water_trough', 'zoo_bird_aviary', 'round_tree_plant', 'zoo_map_board'],
    ['bunny_pen', 'petting_bunny*2', 'goat_feeder', 'zoo_duck_pond', 'little_pony', 'wooden_fence', 'hay_bales', 'zoo_picnic_table', 'butterfly'],
    ['dining_table_set+zoo_fruit_basket+juice_jug', 'bar_stool*2', 'fruit_stand', 'menu_board', 'zoo_map_board', 'ice_cream_cart', 'cute_potted_plant'],
  ],
  aquarium: [
    ['big_fish_tank', 'jellyfish_tank', 'octopus_tube', 'coral_rock', 'cute_seaweed', 'fish_feeder', 'underwater_telescope', 'jellyfish_light'],
    ['big_fish_tank', 'penguin_tank', 'jellyfish_tank', 'cute_seaweed', 'coral_rock', 'jellyfish_light', 'station_bench'],
    ['big_fish_tank', 'cute_sea_turtle', 'turtle_shell', 'pretty_seashell', 'happy_starfish', 'coral_rock', 'crab_toy', 'cute_seaweed', 'fish_feeder'],
    ['dining_table_set+fizzy_drink+french_fries', 'bar_stool*2', 'station_snack_cart', 'jellyfish_tank', 'menu_board', 'cute_seaweed', 'ice_cream_cart'],
  ],
  theme_park: [
    ['ferris_wheel', 'carousel', 'balloon_stand', 'candy_floss_cart', 'theme_park_popcorn_machine', 'ice_cream_cart', 'garden_bench', 'cute_balloon'],
    ['carousel_horse*2', 'cute_small_car*2', 'food_truck', 'theme_park_ticket_stamp', 'balloon_stand'],
    ['candy_floss_cart', 'theme_park_popcorn_machine', 'ice_cream_cart', 'dining_table_set+candy_apple+hot_dog', 'bar_stool*2', 'menu_board', 'juice_tap'],
    ['theme_park_game_counter+cute_photo_flash', 'theme_park_prize_shelf+teddy_bear_toy', 'balloon_stand', 'cute_balloon', 'hospital_heart_balloon', 'theme_park_ticket_stamp'],
  ],
  rollercoaster_place: [
    ['coaster_loop', 'rollercoaster_car', 'ticket_booth', 'balloon_stand', 'candy_floss_cart', 'garden_bench'],
    ['coaster_loop_track', 'coaster_car', 'station_bench', 'cute_photo_flash', 'coaster_safety_buckle', 'big_telescope'],
    ['dining_table_set+candy_apple+fizzy_drink', 'bar_stool*2', 'theme_park_popcorn_machine', 'ice_cream_cart', 'menu_board', 'cute_potted_plant'],
    ['theme_park_prize_shelf+teddy_bear_toy', 'low_display_cabinet+coaster_place_sticker', 'shop_shelving_unit', 'checkout_till', 'cute_photo_flash', 'shopping_bags'],
  ],
  waterpark: [
    ['water_slide_tower', 'waterpark_splash_pad', 'water_cannon', 'splash_bucket', 'waterpark_swim_ring', 'pool_beach_ball', 'beach_umbrella', 'pool_lounger'],
    ['wave_pool', 'lazy_river', 'waterpark_swim_ring', 'pool_ring_float', 'inflatable_flamingo', 'pool_ladder'],
    ['waterpark_snack_stand', 'pool_towel_rack', 'cute_waterpark_towel', 'dining_table_set+french_fries+lemonade_glass', 'bar_stool*2', 'menu_board'],
  ],
  airport: [
    ['check_in_desk*2', 'luggage_trolley', 'airport_carry_suitcase*2', 'departure_board', 'first_class_seat*2', 'cute_potted_plant'],
    ['first_class_seat*2', 'tea_table+tea_cup+croissant', 'airport_coffee_machine', 'cosy_armchair', 'floor_lamp', 'low_display_cabinet+small_flower_vase+book_stack'],
    ['velvet_sofa', 'grand_piano', 'bar_counter+juice_jug', 'bar_stool*2', 'chandelier', 'cosy_armchair', 'floor_lamp', 'cute_potted_plant'],
    ['big_airplane', 'airport_luggage_cart', 'luggage_trolley', 'airport_carry_suitcase', 'traffic_cone*2'],
  ],
  malls: [
    ['mall_cute_fountain', 'mall_escalator', 'garden_bench', 'cute_potted_plant*2', 'mannequin', 'balloon_stand', 'shopping_bags'],
    ['mall_clothes_rack', 'clothes_rack', 'mannequin*2', 'mall_shoe_box', 'mall_toy_shelf', 'glass_display_shelf', 'checkout_till', 'shopping_bags'],
    ['mall_food_court_table+classic_burger+fizzy_drink', 'bar_stool*2', 'pizza_oven', 'mall_food_court_table+pink_donut', 'ice_cream_cart', 'menu_board', 'candy_floss_cart'],
    ['round_tree_plant', 'flower_bed', 'garden_bench', 'garden_fountain', 'mall_shopping_cart', 'beach_umbrella', 'cute_potted_plant'],
  ],
  places_to_eat: [
    ['pizza_oven', 'fruit_stand', 'ice_cream_cart', 'dining_table_set+classic_burger+french_fries', 'bar_stool*2', 'dining_table_set+hot_dog+fizzy_drink', 'juice_tap', 'menu_board'],
    ['sweet_counter+cake_stand+food_street_cupcake', 'dining_table_set+pink_donut+hot_chocolate', 'bar_stool*2', 'ice_cream_cart', 'candy_floss_cart', 'lollipop_stand', 'menu_board'],
  ],
  sports_arena: [
    ['football_goal', 'arena_goal_post', 'sports_cone*2', 'classic_soccer_ball', 'track_barrier', 'scoreboard', 'stadium_seats'],
    ['track_barrier*3', 'sports_cone', 'jump_rope', 'basketball_hoop', 'stadium_seats', 'gold_trophy'],
    ['stadium_ball_rack', 'cute_tennis_racket', 'jump_rope', 'station_bench', 'low_display_cabinet+gold_trophy+sports_medal', 'water_cooler', 'sports_cone'],
  ],
  football_stadium: [
    ['football_goal', 'stadium_soccer_goal', 'stadium_football', 'stadium_training_cones', 'sports_cone', 'stadium_ball_rack', 'stadium_team_banner', 'scoreboard'],
    ['stadium_seats*3', 'stadium_team_banner', 'scoreboard', 'ice_cream_cart', 'balloon_stand'],
    ['low_display_cabinet+gold_trophy', 'stadium_mascot_plush', 'station_bench', 'round_sofa', 'kitchen_table+cute_juice_box', 'wooden_chair', 'stadium_team_banner', 'photo_frame'],
  ],
  school_shopping_place: [
    ['school_uniform_rack', 'backpack_shelf', 'school_lunchbox_shelf+school_shopping_lunchbox', 'shop_shelving_unit', 'checkout_till', 'school_backpack_hook', 'clothes_rack', 'shopping_bags'],
    ['shop_shelving_unit', 'cube_storage_shelf', 'low_display_cabinet+school_shopping_notebook+school_shopping_ruler', 'school_desk+crayon_box+glue_stick', 'checkout_till', 'school_water_bottle', 'cute_potted_plant'],
  ],
  old_people_home: [
    ['cosy_fireplace', 'cosy_armchair*2', 'card_table+jigsaw_puzzle+tea_cup', 'rocking_chair', 'tall_open_bookcase', 'walking_frame', 'photo_frame', 'floor_lamp'],
    ['garden_bench', 'rocking_chair', 'tea_table+tea_cup+storybook', 'wheelchair', 'cute_potted_plant', 'flower_bed', 'soft_blanket', 'bird_bath'],
    ['flower_bed*2', 'garden_bench', 'round_tree_plant', 'elder_walking_stick', 'bird_bath', 'cute_bird_feeder', 'garden_fountain'],
  ],
  supermarket: [
    ['shopping_trolley*2', 'checkout_till', 'fruit_stand+zoo_fruit_basket', 'shop_shelving_unit', 'cute_fridge', 'freezer_chest', 'checkout_till'],
    ['shop_shelving_unit*2', 'fruit_stand+bread_loaf+cheese_wedge', 'cute_fridge', 'freezer_chest', 'shopping_trolley'],
    ['checkout_till*2', 'shopping_trolley', 'shopping_bags', 'candy_jars', 'shop_shelving_unit', 'bus_stop_snack_machine'],
  ],
  eye_opticians: [
    ['glasses_display*2', 'sunglasses_stand', 'optician_lamp', 'salon_mirror', 'eye_chart', 'reception_desk+reading_glasses_tray', 'cosy_armchair', 'low_display_cabinet'],
    ['optician_lamp', 'trial_frame', 'eye_chart', 'office_chair', 'office_desk+contact_lens_box+lens_case+eye_drop_bottle', 'glass_display_shelf', 'makeup_mirror', 'cute_potted_plant'],
  ],
  hair_dressers: [
    ['salon_chair*2', 'salon_mirror*2', 'product_shelf+hair_dryer', 'towel_cart', 'color_swatches', 'cosy_armchair', 'glass_display_shelf'],
    ['salon_chair*2', 'salon_mirror', 'makeup_mirror', 'ladder_shelf', 'towel_cart', 'product_shelf+hair_clips+salon_comb', 'color_swatches', 'cute_potted_plant'],
  ],
  makeup_shop: [
    ['lipstick_display+cute_lipstick', 'nail_polish_rack', 'glass_display_shelf', 'low_display_cabinet+powder_compact+blush_pot', 'makeup_mirror', 'checkout_till', 'salon_chair', 'shopping_bags'],
    ['salon_chair*2', 'makeup_mirror*2', 'product_shelf+brush_set+eyeshadow_palette', 'glass_display_shelf', 'tea_table+tissue_box', 'ladder_shelf', 'cute_potted_plant'],
  ],
  hotels: [
    ['hotel_front_desk+hotel_key_card', 'luggage_trolley', 'chandelier', 'velvet_sofa', 'cosy_armchair', 'welcome_mat', 'grand_piano', 'cute_potted_plant', 'floor_lamp'],
    ['canopy_bed', 'gift_cabinet+night_lamp', 'canopy_bed', 'bathrobe_hook', 'towel_cart', 'window_seat', 'airport_carry_suitcase', 'tea_table+small_flower_vase'],
    ['pool_water', 'pool_lounger*2', 'pool_sun_umbrella', 'round_tree_plant', 'flower_bed', 'pool_drink_cart', 'rubber_duck'],
  ],
  sweets_shop: [
    ['sweet_counter+cake_stand', 'lollipop_stand', 'candy_jars', 'shop_shelving_unit', 'checkout_till', 'candy_floss_cart', 'chocolate_fountain'],
    ['chocolate_fountain', 'dining_table_set+pink_donut+hot_chocolate', 'bar_stool*2', 'lollipop_tree', 'toffee_bench', 'shop_shelving_unit', 'sweet_counter+candy_bowl'],
  ],
  toy_shop: [
    ['shop_shelving_unit', 'mall_toy_shelf', 'dollhouse', 'rocking_horse', 'toy_kitchen', 'teddy_bear_toy', 'checkout_till', 'train_set', 'balloon_stand'],
    ['dollhouse', 'toy_kitchen', 'school_cozy_rug', 'cube_storage_shelf', 'rocket_toy', 'rocking_horse', 'toy_box', 'cute_small_car'],
  ],
  restaurant: [
    ['dining_table_set+salad_bowl+candle', 'wooden_chair*2', 'dining_table_set+classic_burger+lemonade_glass', 'pizza_oven', 'juice_rack', 'menu_chalkboard', 'floor_lamp', 'cute_potted_plant'],
    ['dining_table_set+cheesy_pizza_slice+lemonade_glass', 'beach_umbrella', 'wooden_chair*2', 'dining_table_set+juice_jug', 'flower_bed', 'cute_potted_plant'],
  ],
  offices: [
    ['reception_desk+desktop_computer', 'office_chair', 'cosy_armchair*2', 'water_cooler', 'cute_potted_plant', 'whiteboard', 'filing_cabinet', 'photo_frame'],
    ['office_desk+desktop_computer+office_printer', 'office_chair', 'office_desk+desktop_computer', 'office_chair', 'filing_cabinet', 'tall_open_bookcase', 'whiteboard', 'water_cooler', 'fire_extinguisher'],
    ['garden_bench', 'round_tree_plant', 'flower_bed', 'zoo_picnic_table+juice_jug', 'beach_umbrella', 'cute_potted_plant', 'bird_bath'],
  ],
  vets: [
    ['reception_desk+treat_jar', 'hospital_comfort_chair*2', 'cat_basket', 'pet_cage', 'pet_scale', 'water_bowl', 'sitting_cat', 'cute_potted_plant'],
    ['grooming_table+cute_stethoscope+bandage_roll', 'pet_scale', 'drip_stand', 'first_aid_box', 'sitting_puppy', 'pet_bed', 'low_display_cabinet+treat_jar'],
    ['dog_house', 'pet_bed', 'bone_toy', 'bouncy_ball_toy', 'sitting_puppy', 'water_bowl', 'wooden_fence', 'round_tree_plant'],
  ],
  cafe: [
    ['bar_counter+espresso_machine+cup_stack', 'bar_stool*2', 'cute_fridge', 'sweet_counter+cake_stand+croissant', 'menu_chalkboard', 'cookie_jar', 'cute_potted_plant'],
    ['tea_table+hot_chocolate+croissant', 'cosy_armchair*2', 'velvet_sofa', 'tea_table+small_flower_vase', 'floor_lamp', 'tall_open_bookcase', 'cute_potted_plant'],
    ['dining_table_set+lemonade_glass', 'beach_umbrella', 'wooden_chair*2', 'dining_table_set+cute_cupcake', 'flower_bed', 'cute_potted_plant'],
  ],
  pub: [
    ['bar_counter+juice_jug', 'bar_stool*3', 'juice_rack', 'juice_tap', 'cosy_fireplace', 'dartboard', 'pool_table'],
    ['cosy_fireplace', 'cosy_armchair*2', 'card_table+board_game', 'velvet_sofa', 'toy_guitar', 'floor_lamp', 'photo_frame'],
    ['zoo_picnic_table+snack_basket+juice_jug', 'beach_umbrella', 'zoo_picnic_table+pretzel', 'round_tree_plant', 'flower_bed', 'garden_bench'],
  ],
  stables: [
    ['horse_stall', 'standing_horse', 'horse_stall', 'little_pony', 'hay_bales', 'animal_water_trough', 'wooden_fence', 'stable_door'],
    ['hay_bales*3', 'saddle', 'horse_blanket', 'sitting_cat', 'fire_station_water_bucket', 'stable_door', 'zoo_fruit_basket'],
    ['saddle*2', 'horse_blanket', 'brush_set', 'leash_hook', 'stable_door', 'low_display_cabinet+brush_set', 'fire_station_water_bucket'],
    ['little_pony', 'standing_horse', 'wooden_fence*2', 'hay_bales', 'animal_water_trough', 'round_tree_plant', 'butterfly'],
  ],
  pet_shop: [
    ['cat_tree', 'dog_house', 'birdcage', 'pet_cage', 'cat_basket', 'shop_shelving_unit', 'checkout_till', 'low_display_cabinet+goldfish_bowl', 'sitting_cat'],
    ['big_fish_tank', 'low_display_cabinet+goldfish_bowl+fish_feeder', 'coral_rock', 'hamster', 'pet_rabbit', 'pet_cage', 'shop_shelving_unit', 'pet_scale'],
    ['dog_house', 'sitting_puppy', 'pet_bed', 'bone_toy', 'bouncy_ball_toy', 'wooden_fence', 'round_tree_plant', 'water_bowl'],
  ],
  paint_shop: [
    ['paint_cans*2', 'color_swatches', 'shop_shelving_unit', 'checkout_till', 'school_easel_chalkboard', 'wall_mural', 'low_display_cabinet+paint_roller+paintbrush'],
    ['school_easel_chalkboard', 'wall_mural', 'paint_cans', 'kitchen_table+colour_mixing_bowl+paint_palette', 'wooden_chair', 'color_swatches', 'paint_sponge'],
    ['wall_mural', 'paint_cans', 'paint_roller', 'paint_sponge', 'color_swatches', 'flower_bed', 'garden_bench', 'star_wall_sticker'],
  ],
  secret_garden: [
    ['garden_gate', 'star_stepping_stones', 'flower_bed', 'garden_bench', 'butterfly', 'bird_bath', 'round_tree_plant', 'fairy_lamp'],
    ['flower_bed*2', 'butterfly*2', 'cosy_hammock', 'tire_swing', 'butterfly_net', 'picnic_basket', 'big_rose_bloom'],
    ['fairy_house', 'treasure_chest', 'mushroom_stool*2', 'fairy_lamp', 'leaf_canopy', 'star_lantern', 'cute_potted_plant'],
  ],
  cloud_swing_set: [
    ['cloud_swing', 'moon_cloud_swing', 'rainbow_arch', 'cloud_bench', 'star_lantern', 'sky_flower', 'butterfly'],
    ['cloud_swing', 'moon_hammock', 'rainbow_slide', 'marshmallow_cloud', 'cloud_bench', 'sky_flower', 'cotton_candy_tree'],
    ['big_telescope', 'star_stepping_stones', 'moon_hammock', 'cloud_bench', 'star_lantern*2', 'moon_lantern', 'cloud_star_lamp'],
  ],
  secret_beach_house: [
    ['driftwood_bench', 'kitchen_table+coconut_drink+seashell_basket', 'wooden_chair', 'toy_lighthouse', 'palm_leaf_fan', 'floor_lamp', 'starfish_pillow', 'cute_potted_plant'],
    ['pool_lounger', 'beach_umbrella', 'beach_blanket', 'sandcastle', 'bucket_and_spade', 'happy_starfish', 'pretty_seashell', 'beach_tricycle'],
    ['cosy_hammock', 'cute_potted_plant', 'flower_bed', 'zoo_picnic_table+coconut_drink', 'beach_umbrella', 'diamond_kite', 'seagull_toy'],
  ],
  secret_mansion: [
    ['grand_piano', 'velvet_sofa', 'chandelier', 'gift_cabinet+rose_vase', 'tea_table+tea_cup', 'cosy_fireplace', 'window_seat', 'floor_lamp', 'photo_frame'],
    ['canopy_bed', 'window_seat', 'gift_cabinet+night_lamp', 'floor_lamp', 'sitting_cat', 'velvet_sofa', 'treasure_chest'],
    ['dollhouse', 'rocking_horse', 'toy_box', 'teddy_bear_toy', 'treasure_chest', 'cube_storage_shelf', 'school_cozy_rug', 'rocket_toy'],
    ['garden_fountain', 'flower_bed*2', 'garden_bench', 'round_tree_plant', 'tea_table+floating_cloud_teacup', 'big_rose_bloom'],
  ],
  secret_beach: [
    ['driftwood_boat', 'sandcastle', 'beach_umbrella', 'beach_blanket', 'message_in_bottle', 'pretty_seashell', 'happy_starfish', 'crab_toy', 'seagull_toy'],
    ['beach_umbrella', 'pool_lounger', 'cosy_hammock', 'picnic_basket', 'diamond_kite', 'bucket_and_spade', 'beach_tricycle', 'seashell_basket'],
    ['cosy_hammock', 'ice_cream_cart', 'driftwood_bench', 'beach_umbrella', 'zoo_picnic_table+coconut_drink', 'toy_lighthouse'],
  ],
  starry_observatory: [
    ['big_telescope*2', 'star_lantern', 'cloud_bench', 'globe_stand', 'moon_lantern', 'soft_cushion'],
    ['star_map', 'tall_open_bookcase', 'globe_stand', 'cosy_armchair', 'tea_table+moon_cookie+floating_cloud_teacup', 'rocket_toy', 'floor_lamp', 'round_sofa'],
    ['big_telescope', 'moon_hammock', 'star_lantern', 'cloud_bench', 'moon_lantern', 'rocket_toy'],
  ],
  halloween_house: [
    ['witch_cauldron', 'costume_rack', 'cute_ghost_plush', 'smiling_pumpkin_lantern', 'spider_web_banner', 'kitchen_table+pumpkin_pie+candy_bowl', 'candle', 'moon_lantern'],
    ['pumpkin_planter*2', 'smiling_pumpkin_lantern', 'friendly_bat', 'candy_bucket', 'trick_or_treat_bag', 'garden_bench', 'moon_lantern'],
    ['candy_bowl', 'candy_bucket', 'costume_rack', 'cute_ghost_plush', 'toffee_bench', 'candy_jars', 'spider_web_banner', 'friendly_bat', 'trick_or_treat_bag'],
  ],
  mansion: [
    ['grand_piano', 'velvet_sofa', 'chandelier', 'cosy_fireplace', 'tea_table+tea_cup', 'gift_cabinet+rose_vase', 'window_seat', 'pool_table', 'floor_lamp'],
    ['garden_fountain', 'flower_bed*2', 'garden_bench', 'round_tree_plant', 'garden_swing_set', 'bird_bath', 'big_rose_bloom'],
    ['pool_water', 'pool_lounger*2', 'pool_sun_umbrella', 'cute_potted_plant', 'tea_table+lemonade_glass'],
  ],
  beach_house: [
    ['driftwood_bench', 'kitchen_table+coconut_drink+snack_basket', 'wooden_chair*2', 'seashell_basket', 'starfish_pillow', 'floor_lamp', 'cute_potted_plant', 'toy_lighthouse'],
    ['pool_lounger', 'beach_umbrella', 'cosy_hammock', 'pool_towel_rack', 'bucket_and_spade', 'pool_beach_ball', 'crab_toy'],
    ['sandcastle', 'beach_tricycle', 'flower_bed', 'picnic_basket', 'beach_blanket', 'diamond_kite', 'round_tree_plant'],
  ],
  secret_treehouse: [
    ['rope_ladder', 'tire_swing', 'leaf_canopy', 'toy_box', 'teddy_bear_toy', 'cute_bird_feeder', 'fairy_lamp', 'soft_blanket', 'storybook'],
    ['leaf_canopy', 'monkey_swing', 'fairy_house', 'police_magnifying_glass', 'butterfly_net', 'diamond_kite', 'treasure_chest', 'star_lantern'],
  ],
  secret_candy_cave: [
    ['lollipop_tree*2', 'candy_cane_arch', 'gumdrop_mound', 'chocolate_fountain', 'toffee_bench', 'donut_slide', 'marshmallow_cloud'],
    ['rainbow_slide', 'cotton_candy_tree', 'gumdrop_mound', 'mushroom_stool', 'marshmallow_cloud', 'lollipop_tree', 'candy_bowl', 'toffee_bench'],
  ],
  secret_pet_garden: [
    ['dog_house', 'cat_basket', 'sitting_cat', 'sitting_puppy', 'bird_bath', 'butterfly', 'cute_bird_feeder', 'pet_bed', 'flower_bed', 'hamster_ball'],
    ['zoo_duck_pond', 'petting_bunny', 'bunny_pen', 'hay_bales', 'butterfly', 'round_tree_plant', 'garden_bench', 'pet_rabbit'],
  ],
};

// ---------------------------------------------------------------- laying it out
const templates = new Map(load<Template>(FILES.template).map((t) => [t.id, t]));
const items = load<Item>(FILES.item);
const itemMap = new Map(items.map((i) => [i.id, i]));
const places = load<Place>(FILES.place);
const plan = new Map(load<PlanEntry>(FILES.plan).map((p) => [p.id, p]));
const GENERIC = new Set(['outdoor', 'cosy', 'fancy', 'party', 'birthday', 'wall', 'living', 'garden']);

let seed = 11;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** A colourway of the template for this place: one tagged for it if there is, never a seasonal one elsewhere. */
function itemFor(tid: string, placeTags: Set<string>, seasonal: boolean): Item {
  const any = items.filter((i) => i.template === tid);
  if (!any.length) throw new Error(`no item for template ${tid}`);
  const plain = any.filter((i) => seasonal || (!i.tags.includes('halloween') && !i.tags.includes('christmas')));
  const all = plain.length ? plain : any;
  const fit = all.filter((i) => i.tags.some((t) => placeTags.has(t)));
  const pool = fit.length ? fit : all;
  return pool[Math.floor(rand() * pool.length)];
}
const sizeOf = (it: Item) => templates.get(it.template)!.size ?? { w: 20, h: 20 };
const isWall = (it: Item) => it.tags.includes('wall');
const topOf = (it: Item) => {
  const lv = surfaceLevels(templates.get(it.template)!);
  return lv.length ? lv[lv.length - 1] : null;
};

/** Lay out a spec along a stretch of floor (x0..x0+width), H tall: standing things spread evenly (small things on
 * their tops), then wall things hung where what stands below is short enough. label names it in the left-out notes. */
function arrange(spec: string[], x0: number, width: number, H: number, tags: Set<string>, seasonal: boolean, label: string): Placed[] {
  type Unit = { it: Item; on: Item[] };
  const standing: Unit[] = [], wall: Item[] = [];
  for (const entry of spec) {
    const [head, ...on] = entry.split('+');
    const [tid, times] = head.split('*');
    for (let k = 0; k < Number(times ?? 1); k++) {
      const it = itemFor(tid, tags, seasonal);
      if (isWall(it)) wall.push(it);
      else standing.push({ it, on: on.map((o) => itemFor(o, tags, seasonal)) });
    }
  }
  while (standing.length > 2 && standing.reduce((a, u) => a + sizeOf(u.it).w, 0) > width - 8) dropped.push(`${label} no room for ${standing.pop()!.it.template}`);
  const total = standing.reduce((a, u) => a + sizeOf(u.it).w, 0);
  const gap = Math.max(0, (width - total) / (standing.length + 1));
  const out: Placed[] = [];
  let x = x0 + gap;
  const spans: { a: number; b: number; h: number }[] = [];
  for (const u of standing) {
    const { w, h } = sizeOf(u.it);
    out.push({ item: u.it.id, x: Math.round((x + w / 2) * 10) / 10 });
    spans.push({ a: x, b: x + w, h });
    const top = topOf(u.it);
    if (top !== null && u.on.length) {
      const step = (w * 0.8) / u.on.length;
      u.on.forEach((o, k) => out.push({ item: o.id, x: Math.round((x + w * 0.1 + step * (k + 0.5)) * 10) / 10, y: Math.round(top * 100) / 100 }));
    }
    x += w + gap;
  }
  wall.forEach((it, k) => {
    const { w, h } = sizeOf(it);
    dropped.push(`${label} no wall space for ${it.template}`);
    for (const y of [96, 84, 108, 72, 120].filter((v) => v + h <= H - 6)) {
      const start = x0 + ((k + 0.5) / wall.length) * width;
      for (let d = 0; d < width; d += 12) {
        for (const cx of [start + d, start - d]) {
          if (cx - w / 2 < x0 + 2 || cx + w / 2 > x0 + width - 2) continue;
          const under = spans.filter((s) => s.b > cx - w / 2 && s.a < cx + w / 2);
          const hung = out.filter((o) => (o.y ?? 0) > 10 && isWall(itemMap.get(o.item)!)).some((o) => Math.abs(o.x - cx) < (sizeOf(itemMap.get(o.item)!).w + w) / 2 + 4);
          if (!hung && under.every((s) => s.h < y - 4)) {
            out.push({ item: it.id, x: Math.round(cx), y });
            dropped.pop();
            return;
          }
        }
      }
    }
  });
  return out;
}

const standingWidth = (spec: string[], tags: Set<string>) =>
  spec.reduce((a, e) => {
    const [tid, times] = e.split('+')[0].split('*');
    const it = itemFor(tid, tags, true);
    return a + (isWall(it) ? 0 : sizeOf(it).w * Number(times ?? 1));
  }, 0);

const bad: string[] = [];
const dropped: string[] = [];
const ctx = { items: itemMap, templates };

// ---------------------------------------------------------------- places
const nextPlaces = places.map((p) => {
  const spec = SPEC[p.id];
  if (!spec) {
    bad.push(`${p.id}: no plan`);
    return p;
  }
  if (spec.length !== p.floors.length) bad.push(`${p.id}: plan has ${spec.length} floors, place has ${p.floors.length}`);
  const tags = new Set((plan.get(p.id)?.tags ?? []).filter((t) => !GENERIC.has(t)));
  const seasonal = (plan.get(p.id)?.tags ?? []).includes('halloween');
  return { ...p, floors: p.floors.map((f, i) => {
    if (!spec[i]) return f;
    // A floor too narrow for its plan is widened (up to the limit) so nothing is left out.
    const width = Math.max(f.width, Math.min(1200, Math.ceil(standingWidth(spec[i], tags) * 1.3 + 40)));
    return { ...f, width, items: arrange(spec[i], 0, width, f.outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT, tags, seasonal, `${p.id}[${i}]`) } as Floor;
  }) };
});
for (const p of nextPlaces) bad.push(...placeErrors(p, nextPlaces, ctx));

// ---------------------------------------------------------------- houses: furnished room by room
const ROOMS: Record<string, string[]> = {
  kitchen: ['kitchen_sink_counter', 'kitchen_cooker', 'cute_fridge', 'kitchen_table+cute_apple+milk_bottle', 'wooden_chair*2', 'wall_plank_shelf'],
  living: ['round_sofa', 'tv_stand', 'tea_table+small_flower_vase', 'cosy_armchair', 'floor_lamp', 'photo_frame', 'cute_potted_plant', 'living_rug'],
  bedroom: ['single_cozy_bed', 'bedside_table+night_lamp', 'wardrobe', 'dressing_table', 'photo_frame', 'living_rug'],
  bathroom: ['toilet', 'bathroom_sink', 'bubble_bathtub', 'makeup_mirror', 'bathrobe_hook'],
  nursery: ['baby_cot', 'daycare_changing_table', 'rocking_chair', 'toy_box', 'daycare_floor_mobile', 'teddy_bear_toy'],
  kids_room: ['single_cozy_bed', 'cube_storage_shelf', 'school_desk+crayon_box', 'wooden_chair', 'toy_box', 'star_map', 'teddy_bear_toy'],
  teen_room: ['single_cozy_bed', 'dressing_table', 'school_desk+book_stack', 'office_chair', 'ladder_shelf', 'wall_double_shelf'],
  playroom: ['dollhouse', 'rocking_horse', 'toy_kitchen', 'toy_box', 'school_cozy_rug'],
  garden: ['flower_bed', 'garden_bench', 'round_tree_plant', 'bird_bath', 'garden_swing_set', 'cute_bird_feeder'],
  pool: ['pool_water', 'pool_lounger', 'pool_sun_umbrella', 'pool_beach_ball'],
};
/** A touch of each style, put first in the room so it is kept even when the room is small. */
const STYLE: Record<string, Record<string, string[]>> = {
  mansion: { living: ['grand_piano', 'chandelier'], bedroom: ['canopy_bed'] },
  castle: { living: ['chandelier', 'velvet_sofa'], bedroom: ['canopy_bed'] },
  cabin: { living: ['cosy_fireplace'] },
  farmhouse: { living: ['rocking_chair'], garden: ['hay_bales'] },
  beach: { living: ['seashell_basket'], garden: ['driftwood_bench', 'beach_umbrella'] },
  treehouse: { garden: ['leaf_canopy'], kids_room: ['rope_ladder'] },
  spooky_cute: { living: ['smiling_pumpkin_lantern'], kitchen: ['witch_cauldron'], garden: ['pumpkin_planter'], bedroom: ['cute_ghost_plush'] },
  apartment: { living: ['cute_potted_plant'] },
};
const houses = load<House>(FILES.house);
const roomSpec = (style: string, type: string) => {
  const extra = STYLE[style]?.[type] ?? [];
  // A canopy bed takes the place of the plain one.
  return [...extra, ...ROOMS[type].filter((e) => !(extra.includes('canopy_bed') && e === 'single_cozy_bed'))];
};
const nextHouses = houses.map((h) => ({ ...h, floors: h.floors.map((f, fi) => {
  // Rooms too narrow for their furniture are widened, and the floor with them (sharing out the limit if need be).
  const want = f.rooms.map((r) => Math.max(r.width, Math.ceil(standingWidth(roomSpec(h.style, r.type), new Set([r.type])) * 1.15 + 24)));
  const sum = want.reduce((a, w) => a + w, 0), k = Math.min(1, 1200 / sum);
  const rooms = f.rooms.map((r, i) => ({ ...r, width: Math.max(100, Math.floor(want[i] * k)) }));
  let x0 = 0;
  const placed = rooms.flatMap((r) => {
    const spec = roomSpec(h.style, r.type);
    const out = arrange(spec, x0, r.width, f.outdoor ? OUTDOOR_HEIGHT : WALL_HEIGHT, new Set([r.type]), h.style === 'spooky_cute', `${h.id}[${fi}] ${r.type}`);
    x0 += r.width;
    return out;
  });
  return { ...f, rooms, width: rooms.reduce((a, r) => a + r.width, 0), items: placed };
}) }));
for (const h of nextHouses) bad.push(...houseErrors(h, nextHouses, ctx));

if (bad.length) {
  console.log(bad.join('\n'));
  process.exit(1);
}
for (const d of dropped) console.log(`  (left out) ${d}`);
writeFileSync(FILES.place, `${JSON.stringify(nextPlaces, null, 2)}\n`);
writeFileSync(FILES.house, `${JSON.stringify(nextHouses, null, 2)}\n`);
console.log(`${nextPlaces.length} places, ${nextPlaces.reduce((a, p) => a + p.floors.length, 0)} floors, ${nextPlaces.reduce((a, p) => a + p.floors.reduce((b, f) => b + f.items.length, 0), 0)} things; ${nextHouses.length} houses furnished room by room`);
