import 'package:flutter/material.dart';

abstract final class SvarioColors {
  static const spruce = Color(0xFF183A34);
  static const moss = Color(0xFF6F7F63);
  static const fjord = Color(0xFF607681);
  static const stone = Color(0xFFF4F1EA);
  static const paper = Color(0xFFFFFCF6);
  static const copper = Color(0xFFB8734A);
  static const ink = Color(0xFF17201D);
}

abstract final class SvarioTheme {
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: SvarioColors.spruce,
      brightness: Brightness.light,
      surface: SvarioColors.paper,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: SvarioColors.stone,
      appBarTheme: const AppBarTheme(
        backgroundColor: SvarioColors.paper,
        foregroundColor: SvarioColors.ink,
        elevation: 0,
        centerTitle: false,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: SvarioColors.paper,
        selectedIconTheme: const IconThemeData(color: SvarioColors.spruce),
        selectedLabelTextStyle: const TextStyle(
          color: SvarioColors.spruce,
          fontWeight: FontWeight.w700,
        ),
        unselectedIconTheme: IconThemeData(color: SvarioColors.fjord),
        unselectedLabelTextStyle: TextStyle(color: SvarioColors.fjord),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: SvarioColors.paper,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: SvarioColors.spruce,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          color: SvarioColors.ink,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
        titleLarge: TextStyle(
          color: SvarioColors.ink,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
        bodyMedium: TextStyle(
          color: SvarioColors.ink,
          letterSpacing: 0,
        ),
      ),
    );
  }
}
