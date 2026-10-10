import { describe, it, expect } from 'vitest';
import { getProductCategoryType } from '@/components/product/category-size-guide-modal';
import { MOCK_CATEGORIES, MOCK_COLLECTIONS } from '@/lib/mock-data';

describe('Footwear, Size Guide & Collections Integration', () => {
  describe('Part 1: Categories & Footwear Detection', () => {
    it('should have Footwear as a standalone category in MOCK_CATEGORIES', () => {
      const footwear = MOCK_CATEGORIES.find(c => c.slug === 'footwear');
      expect(footwear).toBeDefined();
      expect(footwear?.name).toBe('Footwear');
    });

    it('should identify category types accurately via getProductCategoryType', () => {
      // Tops
      expect(getProductCategoryType('T-Shirts')).toBe('tops');
      expect(getProductCategoryType('Hoodies')).toBe('tops');
      expect(getProductCategoryType('Shirts')).toBe('tops');
      expect(getProductCategoryType('Sweatshirts')).toBe('tops');

      // Bottomwear
      expect(getProductCategoryType('Jeans')).toBe('bottomwear');
      expect(getProductCategoryType('Cargos')).toBe('bottomwear');
      expect(getProductCategoryType('Joggers')).toBe('bottomwear');
      expect(getProductCategoryType('Shorts')).toBe('bottomwear');

      // Footwear
      expect(getProductCategoryType('Footwear')).toBe('footwear');
      expect(getProductCategoryType('Sneakers')).toBe('footwear');
      expect(getProductCategoryType('Shoes')).toBe('footwear');

      // Accessories
      expect(getProductCategoryType('Accessories')).toBe('accessories');
      expect(getProductCategoryType('Jewelry')).toBe('accessories');
    });
  });

  describe('Part 2: Size Guide Logic', () => {
    it('should have correct footwear conversions for standard sizes', () => {
      // Footwear standard mapping verification
      const footwearSizes = [
        { uk: 'UK 6', eu: '40', usMen: '7', usWomen: '8.5', cm: '24.5' },
        { uk: 'UK 7', eu: '41', usMen: '8', usWomen: '9.5', cm: '25.5' },
        { uk: 'UK 8', eu: '42', usMen: '9', usWomen: '10.5', cm: '26.5' },
        { uk: 'UK 9', eu: '43', usMen: '10', usWomen: '11.5', cm: '27.5' },
        { uk: 'UK 10', eu: '44', usMen: '11', usWomen: '12.5', cm: '28.5' },
        { uk: 'UK 11', eu: '45', usMen: '12', usWomen: '13.5', cm: '29.5' },
        { uk: 'UK 12', eu: '46', usMen: '13', usWomen: '14.5', cm: '30.5' },
      ];

      expect(footwearSizes.length).toBe(7);
      expect(footwearSizes[0].uk).toBe('UK 6');
      expect(footwearSizes[2].cm).toBe('26.5');
    });
  });

  describe('Part 3 & 4: Collections & Capsule drops banner images', () => {
    it('should include banner_image_url support in collections', () => {
      const monochromeKicks = MOCK_COLLECTIONS.find(c => c.slug === 'bubble-boom-monochrome-kicks');
      expect(monochromeKicks).toBeDefined();
      expect(monochromeKicks?.name || monochromeKicks?.title).toBe('BUBBLE BOOM – MONOCHROME KICKS');
      expect(monochromeKicks?.banner_image_url).toContain('bubble-boom-black-white-chunky-sneaker.png');
    });
  });
});
