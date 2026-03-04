declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const Ionicons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const MaterialIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const FontAwesome: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const Feather: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const MaterialCommunityIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
}
