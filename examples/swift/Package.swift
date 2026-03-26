// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "GranboardBLE",
    platforms: [
        .macOS(.v13),
    ],
    targets: [
        .executableTarget(
            name: "GranboardBLE",
            path: "Sources"
        ),
    ]
)
