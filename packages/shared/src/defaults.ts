export type DefaultSubcategory = {
  id: string;
  name: string;
};

export type DefaultCategory = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: DefaultSubcategory[];
};

/** Stable IDs so two devices seeding the same defaults stay idempotent after sync. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    id: '550e8400-e29b-41d4-a716-000000000001',
    name: 'Office',
    sortOrder: 1,
    subcategories: [
      { id: '550e8400-e29b-41d4-a716-000000000101', name: 'Stationery' },
      { id: '550e8400-e29b-41d4-a716-000000000102', name: 'Furniture' },
      { id: '550e8400-e29b-41d4-a716-000000000103', name: 'Electronics' },
      { id: '550e8400-e29b-41d4-a716-000000000104', name: 'Cleaning' },
      { id: '550e8400-e29b-41d4-a716-000000000105', name: 'Other' },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000002',
    name: 'Travel',
    sortOrder: 2,
    subcategories: [
      { id: '550e8400-e29b-41d4-a716-000000000201', name: 'Flight' },
      { id: '550e8400-e29b-41d4-a716-000000000202', name: 'Hotel' },
      { id: '550e8400-e29b-41d4-a716-000000000203', name: 'Cab' },
      { id: '550e8400-e29b-41d4-a716-000000000204', name: 'Fuel' },
      { id: '550e8400-e29b-41d4-a716-000000000205', name: 'Other' },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000003',
    name: 'Utilities',
    sortOrder: 3,
    subcategories: [
      { id: '550e8400-e29b-41d4-a716-000000000301', name: 'Electricity' },
      { id: '550e8400-e29b-41d4-a716-000000000302', name: 'Internet' },
      { id: '550e8400-e29b-41d4-a716-000000000303', name: 'Water' },
      { id: '550e8400-e29b-41d4-a716-000000000304', name: 'Mobile' },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000004',
    name: 'Marketing',
    sortOrder: 4,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000005',
    name: 'Maintenance',
    sortOrder: 5,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000006',
    name: 'Communication',
    sortOrder: 6,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000007',
    name: 'Professional Services',
    sortOrder: 7,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000008',
    name: 'Inventory',
    sortOrder: 8,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000009',
    name: 'Bank Charges',
    sortOrder: 9,
    subcategories: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-000000000010',
    name: 'Miscellaneous',
    sortOrder: 10,
    subcategories: [],
  },
];
