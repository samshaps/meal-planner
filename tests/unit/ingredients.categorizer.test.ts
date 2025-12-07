// tests/unit/ingredients.categorizer.test.ts

import { categorizeIngredient, categorizeIngredients } from "@/lib/ingredients/categorizer";
import { AggregatedIngredient } from "@/lib/ingredients/types";

describe("Ingredient Categorizer", () => {
  describe("Produce categorization", () => {
    it("should categorize '5 medium zucchinis' as Produce", async () => {
      const category = await categorizeIngredient("5 medium zucchinis", false, "zucchini", "zucchini");
      expect(category).toBe("Produce");
    });

    it("should categorize '1 cup basil leaves' as Produce", async () => {
      const category = await categorizeIngredient("1 cup basil leaves", false, "basil", "basil");
      expect(category).toBe("Produce");
    });

    it("should categorize '2 cups broccoli florets' as Produce", async () => {
      const category = await categorizeIngredient("2 cups broccoli florets", false, "broccoli florets", "broccoli florets");
      expect(category).toBe("Produce");
    });

    it("should categorize '4 large bell peppers (any color)' as Produce", async () => {
      const category = await categorizeIngredient("4 large bell peppers (any color)", false, "bell pepper", "bell peppers");
      expect(category).toBe("Produce");
    });

    it("should categorize '1 can (14 oz) diced tomatoes' as Produce", async () => {
      const category = await categorizeIngredient("1 can (14 oz) diced tomatoes", false, "diced tomatoes", "diced tomatoes");
      expect(category).toBe("Produce");
    });
  });

  describe("Meat/Fish categorization", () => {
    it("should categorize '1 lb ground beef' as Meat/Fish", async () => {
      const category = await categorizeIngredient("1 lb ground beef", false, "ground beef", "ground beef");
      expect(category).toBe("Meat/Fish");
    });

    it("should categorize '4 salmon fillets (about 6 oz each)' as Meat/Fish", async () => {
      const category = await categorizeIngredient("4 salmon fillets (about 6 oz each)", false, "salmon", "salmon fillets");
      expect(category).toBe("Meat/Fish");
    });

    it("should categorize salmon using canonicalName/baseName, not display label", async () => {
      // Test that it uses canonicalName/baseName, not the full display label
      const category1 = await categorizeIngredient("4 salmon Fillets (about 6 oz Each)", false, "salmon", "salmon fillets");
      expect(category1).toBe("Meat/Fish");
      
      // Test with just canonicalName
      const category2 = await categorizeIngredient("salmon fillets", false, "salmon", undefined);
      expect(category2).toBe("Meat/Fish");
      
      // Test with just baseName
      const category3 = await categorizeIngredient("salmon fillets", false, undefined, "salmon fillets");
      expect(category3).toBe("Meat/Fish");
    });

    it("should categorize 'chicken breasts' as Meat/Fish", async () => {
      const category = await categorizeIngredient("chicken breasts", false, "chicken breasts", "chicken breasts");
      expect(category).toBe("Meat/Fish");
    });
  });

  describe("Dairy categorization", () => {
    it("should categorize '4 tbsp grated parmesan cheese' as Dairy", async () => {
      const category = await categorizeIngredient("4 tbsp grated parmesan cheese", false, "parmesan cheese", "parmesan cheese");
      expect(category).toBe("Dairy");
    });

    it("should categorize '1/2 cup shredded mozzarella cheese (optional, for topping)' as Dairy", async () => {
      const category = await categorizeIngredient("1/2 cup shredded mozzarella cheese (optional, for topping)", false, "mozzarella", "mozzarella");
      expect(category).toBe("Dairy");
    });

    it("should categorize 'feta cheese' as Dairy", async () => {
      const category = await categorizeIngredient("feta cheese", false, "feta cheese", "feta cheese");
      expect(category).toBe("Dairy");
    });
  });

  describe("Dry Goods categorization", () => {
    it("should categorize '2 cups cooked chickpeas (or 1 can and drained)' as Dry Goods", async () => {
      const category = await categorizeIngredient("2 cups cooked chickpeas (or 1 can and drained)", false, "chickpeas", "chickpeas");
      expect(category).toBe("Dry Goods");
    });

    it("should categorize 'quinoa' as Dry Goods", async () => {
      const category = await categorizeIngredient("quinoa", false, "quinoa", "quinoa");
      expect(category).toBe("Dry Goods");
    });

    it("should categorize 'red lentils' as Dry Goods", async () => {
      const category = await categorizeIngredient("red lentils", false, "red lentils", "red lentils");
      expect(category).toBe("Dry Goods");
    });
  });

  describe("Pantry categorization", () => {
    it("should categorize '1 can (14 oz) coconut milk' as Pantry", async () => {
      const category = await categorizeIngredient("1 can (14 oz) coconut milk", false, "coconut milk", "coconut milk");
      expect(category).toBe("Pantry");
    });

    it("should categorize '4 tbsp balsamic vinegar' as Pantry", async () => {
      const category = await categorizeIngredient("4 tbsp balsamic vinegar", false, "balsamic vinegar", "balsamic vinegar");
      expect(category).toBe("Pantry");
    });

    it("should categorize '1 tbsp sesame oil' as Pantry", async () => {
      const category = await categorizeIngredient("1 tbsp sesame oil", false, "sesame oil", "sesame oil");
      expect(category).toBe("Pantry");
    });

    it("should categorize '1 tbsp rice vinegar' as Pantry", async () => {
      const category = await categorizeIngredient("1 tbsp rice vinegar", false, "rice vinegar", "rice vinegar");
      expect(category).toBe("Pantry");
    });
  });

  describe("Spices categorization", () => {
    it("should categorize '1 tbsp chili powder' as Spices", async () => {
      const category = await categorizeIngredient("1 tbsp chili powder", false, "chili powder", "chili powder");
      expect(category).toBe("Spices");
    });

    it("should categorize '2 tsp smoked paprika' as Spices", async () => {
      const category = await categorizeIngredient("2 tsp smoked paprika", false, "smoked paprika", "smoked paprika");
      expect(category).toBe("Spices");
    });

    it("should categorize '2 tsp ground cumin' as Spices", async () => {
      const category = await categorizeIngredient("2 tsp ground cumin", false, "ground cumin", "ground cumin");
      expect(category).toBe("Spices");
    });

    it("should categorize '1 tsp ground cinnamon' as Spices", async () => {
      const category = await categorizeIngredient("1 tsp ground cinnamon", false, "ground cinnamon", "ground cinnamon");
      expect(category).toBe("Spices");
    });
  });

  describe("Salmon fillets categorization", () => {
    it("should classify salmon fillets as Meat/Fish using includes() safety check", async () => {
      // Test the early safety check using includes("salmon")
      const category = await categorizeIngredient("4 salmon Fillets (about 6 oz Each)", false, "salmon fillets", "salmon fillets");
      expect(category).toBe("Meat/Fish");
    });

    it("should classify salmon fillets as Meat/Fish even with just canonicalName", async () => {
      const category = await categorizeIngredient("salmon fillets", false, "salmon", undefined);
      expect(category).toBe("Meat/Fish");
    });

    it("should classify salmon fillets as Meat/Fish using batch categorization", async () => {
      const ingredients: Array<{ name: string; canonicalName?: string; baseName?: string }> = [
        {
          name: "4 salmon Fillets (about 6 oz Each)",
          canonicalName: "salmon",
          baseName: "salmon fillets",
        },
      ];
      const categories = await categorizeIngredients(["4 salmon Fillets (about 6 oz Each)"], false, ingredients);
      expect(categories.get("4 salmon Fillets (about 6 oz Each)")).toBe("Meat/Fish");
    });
  });

  describe("Specific misclassification fixes", () => {
    it("should categorize '2.5 tsp garlic powder' as Spices, NOT Produce", async () => {
      const category = await categorizeIngredient("2.5 tsp garlic powder", false, "garlic powder", "garlic powder");
      expect(category).toBe("Spices");
    });

    it("should categorize '0.5 tsp onion powder' as Spices, NOT Produce", async () => {
      const category = await categorizeIngredient("0.5 tsp onion powder", false, "onion powder", "onion powder");
      expect(category).toBe("Spices");
    });

    it("should categorize '1 bell pepper' as Produce, NOT Spices", async () => {
      const category = await categorizeIngredient("1 bell pepper", false, "bell pepper", "bell pepper");
      expect(category).toBe("Produce");
    });

    it("should categorize '2 chicken Breasts' as Meat/Fish, NOT Other", async () => {
      const category = await categorizeIngredient("2 chicken Breasts", false, "chicken breasts", "chicken breasts");
      expect(category).toBe("Meat/Fish");
    });

    it("should categorize '8 lettuce Leaves' as Produce, NOT Other", async () => {
      const category = await categorizeIngredient("8 lettuce Leaves (for Taco Shells)", false, "lettuce", "lettuce leaves");
      expect(category).toBe("Produce");
    });

    it("should categorize '1 small Tomato' as Produce, NOT Other", async () => {
      const category = await categorizeIngredient("1 small Tomato", false, "tomato", "tomato");
      expect(category).toBe("Produce");
    });

    it("should categorize '4 salmon Fillets (6 oz Each)' as Meat/Fish, NOT Other", async () => {
      const category = await categorizeIngredient("4 salmon Fillets (6 oz Each)", false, "salmon", "salmon fillets");
      expect(category).toBe("Meat/Fish");
    });
  });
});

// Simple test runner for manual execution
if (require.main === module) {
  console.log("Running ingredient categorizer tests...");
  console.log("Please set up a test framework (Jest, Vitest, etc.) to run these tests.");
}

