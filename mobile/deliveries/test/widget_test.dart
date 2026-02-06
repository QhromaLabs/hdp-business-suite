import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hdp_deliveries/main.dart';

void main() {
  testWidgets('App starts and shows login', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp(initialRoute: '/login'));

    // Verify that we are on the login page
    expect(find.text('HDP(k) DELIVERIES'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
  });
}
