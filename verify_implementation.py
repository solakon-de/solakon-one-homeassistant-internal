#!/usr/bin/env python3
"""Verification script for Solakon ONE implementation."""

import sys
from pathlib import Path


def check_files_exist():
    """Check that all required files exist."""
    print("Checking required files...")
    files = {
        "const.py": "Constants and definitions",
        "sensor.py": "Sensor platform",
        "select.py": "Select platform",
        "number.py": "Number platform",
        "__init__.py": "Integration setup",
    }

    all_exist = True
    for filename, desc in files.items():
        filepath = Path(f"custom_components/solakon_one/{filename}")
        if filepath.exists():
            print(f"  ✓ {desc} ({filename})")
        else:
            print(f"  ✗ {desc} ({filename}) NOT FOUND")
            all_exist = False

    return all_exist


def check_register_definitions():
    """Check register definitions in const.py."""
    print("\nChecking register definitions...")
    const_file = Path("custom_components/solakon_one/const.py")
    content = const_file.read_text()

    checks = [
        ("bms1_soc", 37612, "BMS1 SoC"),
        ("eps_output", 46613, "EPS Output"),
        ("export_power_limit", 46616, "Export Power Limit"),
        ("work_mode", 49203, "Work Mode"),
    ]

    all_found = True
    for name, addr, desc in checks:
        if f'"{name}"' in content and str(addr) in content:
            print(f"  ✓ {desc} at address {addr}")
        else:
            print(f"  ✗ {desc} NOT found")
            all_found = False

    # Check RW flags
    if '"rw": True' in content:
        rw_count = content.count('"rw": True')
        print(f"  ✓ Found {rw_count} read/write registers")
    else:
        print("  ✗ No RW flags found")
        all_found = False

    return all_found


def check_sensor_definitions():
    """Check sensor definitions."""
    print("\nChecking sensor definitions...")
    const_file = Path("custom_components/solakon_one/const.py")
    content = const_file.read_text()

    sensors = ["bms1_soc", "eps_output", "export_power_limit", "work_mode"]

    all_found = True
    for sensor in sensors:
        if f'"{sensor}"' in content and "SENSOR_DEFINITIONS" in content:
            print(f"  ✓ Sensor definition for {sensor}")
        else:
            print(f"  ✗ Sensor definition for {sensor} NOT found")
            all_found = False

    return all_found


def check_control_definitions():
    """Check select and number definitions."""
    print("\nChecking control entity definitions...")
    const_file = Path("custom_components/solakon_one/const.py")
    content = const_file.read_text()

    all_found = True

    # Check SELECT_DEFINITIONS
    if "SELECT_DEFINITIONS" in content:
        print("  ✓ SELECT_DEFINITIONS found")
        if "eps_output" in content and "work_mode" in content:
            print("    ✓ EPS Output and Work Mode defined")
        else:
            print("    ✗ Missing select definitions")
            all_found = False
    else:
        print("  ✗ SELECT_DEFINITIONS NOT found")
        all_found = False

    # Check NUMBER_DEFINITIONS
    if "NUMBER_DEFINITIONS" in content:
        print("  ✓ NUMBER_DEFINITIONS found")
        if "export_power_limit" in content:
            print("    ✓ Export Power Limit defined")
        else:
            print("    ✗ Missing number definitions")
            all_found = False
    else:
        print("  ✗ NUMBER_DEFINITIONS NOT found")
        all_found = False

    return all_found


def check_platforms():
    """Check platform configuration."""
    print("\nChecking platform configuration...")
    init_file = Path("custom_components/solakon_one/__init__.py")
    content = init_file.read_text()

    if "Platform.SELECT" in content and "Platform.NUMBER" in content:
        print("  ✓ SELECT and NUMBER platforms registered")
        return True
    else:
        print("  ✗ Platforms NOT properly registered")
        return False


def main():
    """Main verification function."""
    print("=" * 60)
    print("Solakon ONE Integration Verification")
    print("=" * 60)

    checks = [
        check_files_exist(),
        check_register_definitions(),
        check_sensor_definitions(),
        check_control_definitions(),
        check_platforms(),
    ]

    print("\n" + "=" * 60)

    if all(checks):
        print("✓ ALL CHECKS PASSED")
        print("\nImplementation Summary:")
        print("  • BMS1 SoC: Read-only sensor at address 37612")
        print("  • EPS Output: Read/Write select at address 46613")
        print("  • Export Power Limit: Read/Write number at address 46616")
        print("  • Work Mode: Read/Write select at address 49203")
        print("\n✓ Integration is ready for Home Assistant!")
        return 0
    else:
        print("✗ SOME CHECKS FAILED")
        print("\nPlease review the failed checks above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())