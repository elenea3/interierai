
export enum DesignStyle {
  MODERN = 'Modern',
  MINIMALIST = 'Minimalist',
  SCANDINAVIAN = 'Scandinavian',
  INDUSTRIAL = 'Industrial',
  BOHEMIAN = 'Bohemian',
  CLASSIC = 'Classic',
  JAPANDI = 'Japandi'
}

export interface RenderResult {
  id: string;
  url: string;
  style: DesignStyle;
  description: string;
}

export interface ImprovementSuggestion {
  question: string;
  category: string;
}
