"""Number platform for Solakon ONE integration."""
from __future__ import annotations

import logging

from homeassistant.components.number import NumberEntity, NumberMode, NumberDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfPower
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, NUMBER_DEFINITIONS, REGISTERS

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Solakon ONE number entities."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]
    hub = hass.data[DOMAIN][config_entry.entry_id]["hub"]

    # Get device info for all numbers
    device_info = await hub.async_get_device_info()

    entities = []
    for key, definition in NUMBER_DEFINITIONS.items():
        # Only create number entities for registers that have rw flag
        if key in REGISTERS and REGISTERS[key].get("rw", False):
            entities.append(
                SolakonNumber(
                    coordinator,
                    hub,
                    config_entry,
                    key,
                    definition,
                    device_info,
                )
            )

    async_add_entities(entities, True)


class SolakonNumber(CoordinatorEntity, NumberEntity):
    """Representation of a Solakon ONE number entity."""

    def __init__(
        self,
        coordinator,
        hub,
        config_entry: ConfigEntry,
        number_key: str,
        definition: dict,
        device_info: dict,
    ) -> None:
        """Initialize the number entity."""
        super().__init__(coordinator)
        self._hub = hub
        self._number_key = number_key
        self._definition = definition
        self._config_entry = config_entry
        self._device_info = device_info
        self._register_config = REGISTERS[number_key]

        # Set unique ID and entity ID
        self._attr_unique_id = f"{config_entry.entry_id}_{number_key}"
        self.entity_id = f"number.solakon_one_{number_key}"

        # Set basic attributes
        self._attr_name = definition["name"]
        self._attr_icon = definition.get("icon")

        # Set number attributes
        self._attr_native_min_value = definition.get("min", 0)
        self._attr_native_max_value = definition.get("max", 100)
        self._attr_native_step = definition.get("step", 1)

        # Set device class and unit
        if definition.get("device_class") == "power":
            self._attr_device_class = NumberDeviceClass.POWER
            self._attr_native_unit_of_measurement = UnitOfPower.WATT
        elif definition.get("unit"):
            self._attr_native_unit_of_measurement = definition["unit"]

        # Set mode
        mode = definition.get("mode", "box")
        if mode == "box":
            self._attr_mode = NumberMode.BOX
        elif mode == "slider":
            self._attr_mode = NumberMode.SLIDER
        else:
            self._attr_mode = NumberMode.AUTO

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
        return DeviceInfo(
            identifiers={(DOMAIN, self._config_entry.entry_id)},
            name=self._config_entry.data.get("name", "Solakon ONE"),
            manufacturer=self._device_info.get("manufacturer", "Solakon"),
            model=self._device_info.get("model", "One"),
            sw_version=self._device_info.get("version"),
            serial_number=self._device_info.get("serial"),
        )

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        if self.coordinator.data and self._number_key in self.coordinator.data:
            value = self.coordinator.data[self._number_key]

            # Apply scaling if defined
            scale = self._register_config.get("scale", 1)
            if scale != 1:
                # When reading, we divide by scale in modbus.py
                # So the value is already scaled properly
                self._attr_native_value = value
            else:
                self._attr_native_value = value
        else:
            self._attr_native_value = None

        self.async_write_ha_state()

    async def async_set_native_value(self, value: float) -> None:
        """Update the current value."""
        # Convert float to int for register writing
        int_value = int(value)

        # Apply scaling if needed (reverse of read scaling)
        scale = self._register_config.get("scale", 1)
        if scale != 1:
            int_value = int(value * scale)

        address = self._register_config["address"]
        count = self._register_config.get("count", 1)

        _LOGGER.info(f"Setting {self._number_key} to {value} (scaled value: {int_value})")

        # Write the value to the register(s)
        if count == 1:
            # Single register write
            success = await self._hub.async_write_register(address, int_value)
        else:
            # Multi-register write for 32-bit values
            # Split into high and low words
            high_word = (int_value >> 16) & 0xFFFF
            low_word = int_value & 0xFFFF
            values = [high_word, low_word]
            success = await self._hub.async_write_registers(address, values)

        if success:
            _LOGGER.info(f"Successfully set {self._number_key} to {value}")
            # Request coordinator to refresh data
            await self.coordinator.async_request_refresh()
        else:
            _LOGGER.error(f"Failed to set {self._number_key} to {value}")

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self.coordinator.last_update_success and self._attr_native_value is not None