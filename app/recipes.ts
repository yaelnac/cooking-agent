export type RecipeCategory = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export type Recipe = {
  slug: string;
  name: string;
  category: RecipeCategory;
  angle: string;
  calories: [number, number];
  protein: [number, number];
  minutes: number;
  tags: string[];
};

export const RECIPES: Recipe[] = [
  // Breakfast
  { slug: "smoothie-bowl", name: "Smoothie bowl", category: "Breakfast", angle: "Sweet, cold, filling", calories: [350, 500], protein: [25, 40], minutes: 3, tags: ["No cook", "Sweet"] },
  { slug: "yogurt-berry-bowl", name: "Greek yogurt berry bowl", category: "Breakfast", angle: "Fastest protein win", calories: [250, 450], protein: [25, 40], minutes: 2, tags: ["No cook"] },
  { slug: "turkey-egg-wrap", name: "Turkey egg breakfast wrap", category: "Breakfast", angle: "Portable & savory", calories: [400, 600], protein: [35, 50], minutes: 10, tags: ["Savory"] },
  { slug: "protein-oats", name: "Protein oats with banana", category: "Breakfast", angle: "Pre-training fuel", calories: [400, 550], protein: [25, 40], minutes: 5, tags: ["Pre-workout"] },
  { slug: "cottage-toast", name: "Cottage cheese toast with egg", category: "Breakfast", angle: "Quick & savory", calories: [350, 500], protein: [25, 40], minutes: 8, tags: ["Savory"] },
  { slug: "egg-white-scramble", name: "Egg white & whole egg scramble", category: "Breakfast", angle: "Lighter, not dry", calories: [250, 400], protein: [30, 45], minutes: 8, tags: ["Lower cal"] },
  { slug: "potato-turkey-skillet", name: "Breakfast potato turkey skillet", category: "Breakfast", angle: "Post-workout fill-up", calories: [500, 700], protein: [35, 50], minutes: 25, tags: ["Post-workout"] },
  { slug: "banana-pancakes", name: "High-protein banana pancakes", category: "Breakfast", angle: "Sweet, still macros", calories: [400, 600], protein: [25, 40], minutes: 12, tags: ["Sweet"] },
  { slug: "salmon-egg-toast", name: "Smoked salmon egg toast", category: "Breakfast", angle: "Café energy, real protein", calories: [350, 500], protein: [25, 40], minutes: 8, tags: ["Savory"] },
  { slug: "tofu-scramble", name: "Tofu breakfast scramble", category: "Breakfast", angle: "Veggie & high protein", calories: [300, 500], protein: [25, 40], minutes: 10, tags: ["Vegetarian"] },

  // Lunch
  { slug: "chicken-rice-bowl", name: "Chicken rice power bowl", category: "Lunch", angle: "Balanced classic", calories: [500, 700], protein: [40, 55], minutes: 25, tags: ["Meal prep"] },
  { slug: "turkey-avocado-wrap", name: "Turkey avocado lunch wrap", category: "Lunch", angle: "Done in five", calories: [400, 600], protein: [30, 45], minutes: 5, tags: ["Fast"] },
  { slug: "tuna-rice-bowl", name: "Tuna rice cucumber bowl", category: "Lunch", angle: "Cheap & cold-prep", calories: [400, 600], protein: [30, 45], minutes: 5, tags: ["Cheap"] },
  { slug: "chicken-caesar", name: "Chicken Caesar protein salad", category: "Lunch", angle: "A salad that fills you", calories: [400, 650], protein: [40, 55], minutes: 8, tags: ["Salad"] },
  { slug: "egg-potato-plate", name: "Egg & potato lunch plate", category: "Lunch", angle: "Pantry-only", calories: [450, 650], protein: [25, 40], minutes: 22, tags: ["Cheap"] },
  { slug: "salmon-rice-bowl", name: "Salmon rice bowl", category: "Lunch", angle: "Protein + healthy fats", calories: [550, 750], protein: [35, 50], minutes: 15, tags: ["Omega-3"] },
  { slug: "chicken-hummus-pita", name: "Chicken hummus pita", category: "Lunch", angle: "Mediterranean lift", calories: [500, 700], protein: [35, 50], minutes: 7, tags: ["Mediterranean"] },
  { slug: "turkey-burger-bowl", name: "Turkey burger bowl", category: "Lunch", angle: "Burger night, lighter", calories: [500, 700], protein: [40, 55], minutes: 22, tags: ["Comfort"] },
  { slug: "shrimp-quinoa-bowl", name: "Shrimp quinoa bowl", category: "Lunch", angle: "Light but filling", calories: [450, 650], protein: [35, 50], minutes: 12, tags: ["Light"] },
  { slug: "protein-pasta-salad", name: "High-protein pasta salad", category: "Lunch", angle: "Meal-prep hero", calories: [500, 750], protein: [35, 55], minutes: 18, tags: ["Meal prep"] },

  // Dinner
  { slug: "honey-garlic-wings", name: "Honey garlic chicken wings", category: "Dinner", angle: "Comfort, with macros", calories: [500, 800], protein: [35, 60], minutes: 28, tags: ["Air fryer"] },
  { slug: "chicken-tenders", name: "Air fryer chicken tenders", category: "Dinner", angle: "Crispy, not fried", calories: [450, 650], protein: [45, 60], minutes: 18, tags: ["Air fryer"] },
  { slug: "turkey-meatballs", name: "Turkey meatballs with rice", category: "Dinner", angle: "Cozy & meal-prep friendly", calories: [500, 750], protein: [40, 60], minutes: 25, tags: ["Meal prep"] },
  { slug: "salmon-potatoes", name: "Garlic lemon salmon & potatoes", category: "Dinner", angle: "Omega-3 dinner", calories: [550, 800], protein: [35, 50], minutes: 25, tags: ["Omega-3"] },
  { slug: "chicken-fajita-bowl", name: "Chicken fajita bowl", category: "Dinner", angle: "Flavor-loaded", calories: [500, 700], protein: [40, 60], minutes: 18, tags: ["Bowl"] },
  { slug: "beef-broccoli-bowl", name: "Beef & broccoli rice bowl", category: "Dinner", angle: "Takeout, lighter", calories: [550, 750], protein: [35, 55], minutes: 15, tags: ["Takeout-style"] },
  { slug: "chicken-pasta", name: "High-protein chicken pasta", category: "Dinner", angle: "Comfort, kept honest", calories: [600, 850], protein: [45, 65], minutes: 22, tags: ["Comfort"] },
  { slug: "shrimp-tacos", name: "Shrimp tacos with yogurt sauce", category: "Dinner", angle: "Light taco night", calories: [450, 650], protein: [35, 50], minutes: 12, tags: ["Tacos"] },
  { slug: "turkey-stuffed-peppers", name: "Turkey stuffed peppers", category: "Dinner", angle: "Built for leftovers", calories: [400, 600], protein: [30, 45], minutes: 35, tags: ["Meal prep"] },
  { slug: "teriyaki-tofu-bowl", name: "Teriyaki tofu rice bowl", category: "Dinner", angle: "Veggie & high-protein", calories: [500, 700], protein: [25, 40], minutes: 18, tags: ["Vegetarian"] },

  // Snacks
  { slug: "protein-hot-chocolate", name: "Protein hot chocolate", category: "Snacks", angle: "Sweet, warm, protein-y", calories: [150, 300], protein: [20, 35], minutes: 4, tags: ["Drink"] },
  { slug: "cottage-dessert-bowl", name: "Cottage cheese dessert bowl", category: "Snacks", angle: "Sweet snack, no cook", calories: [250, 400], protein: [25, 35], minutes: 2, tags: ["No cook"] },
  { slug: "yogurt-cookie-dough", name: "Greek yogurt cookie dough bowl", category: "Snacks", angle: "Dessert-feel, real macros", calories: [250, 450], protein: [25, 40], minutes: 5, tags: ["Sweet"] },
  { slug: "apple-yogurt-plate", name: "Apple cinnamon yogurt plate", category: "Snacks", angle: "Filling & sweet", calories: [250, 400], protein: [20, 35], minutes: 3, tags: ["No cook"] },
  { slug: "banana-bites", name: "Air fryer protein banana bites", category: "Snacks", angle: "Sweet, better macros", calories: [250, 450], protein: [15, 30], minutes: 12, tags: ["Air fryer"] },
  { slug: "protein-pudding", name: "High-protein chocolate pudding", category: "Snacks", angle: "Dessert, no stove", calories: [200, 350], protein: [25, 40], minutes: 3, tags: ["No cook"] },
  { slug: "turkey-rollups", name: "Turkey cucumber roll-ups", category: "Snacks", angle: "Protein in a minute", calories: [150, 300], protein: [20, 35], minutes: 2, tags: ["No cook"] },
  { slug: "protein-coffee", name: "Protein coffee", category: "Snacks", angle: "Caffeine + 25g protein", calories: [120, 250], protein: [20, 35], minutes: 4, tags: ["Drink"] },
  { slug: "rice-cake-snack", name: "Rice cake protein snack", category: "Snacks", angle: "Pre-workout & sweet", calories: [200, 400], protein: [15, 30], minutes: 2, tags: ["Pre-workout"] },
  { slug: "frozen-yogurt-bark", name: "Frozen yogurt bark", category: "Snacks", angle: "Meal-prep dessert", calories: [150, 250], protein: [10, 20], minutes: 10, tags: ["Meal prep"] },
];

export const CATEGORIES: RecipeCategory[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];
