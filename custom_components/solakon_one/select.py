"""Select platform for Solakon ONE integration."""
from __future__ import annotations

import logging

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, SELECT_DEFINITIONS, REGISTERS

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Solakon ONE select entities."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]
    hub = hass.data[DOMAIN][config_entry.entry_id]["hub"]

    # Get device info
    device_info = await hub.async_get_device_info()

    entities = []
    for key, definition in SELECT_DEFINITIONS.items():
        # Only create select entities for registers that exist and have rw flag
        if key in REGISTERS and REGISTERS[key].get("rw", False):
            entities.append(
                SolakonSelect(
                    coordinator,
                    hub,
                    config_entry,
                    key,
                    definition,
                    device_info,
                )
            )

    if entities:
        async_add_entities(entities, True)


class SolakonSelect(CoordinatorEntity, SelectEntity):
    """Representation of a Solakon ONE select entity."""

    def __init__(
        self,
        coordinator,
        hub,
        config_entry: ConfigEntry,
        select_key: str,
        definition: dict,
        device_info: dict,
    ) -> None:
        """Initialize the select entity."""
        super().__init__(coordinator)
        self._hub = hub
        self._select_key = select_key
        self._definition = definition
        self._config_entry = config_entry
        self._device_info = device_info
        self._register_config = REGISTERS[select_key]

        # Set unique ID and entity ID
        self._attr_unique_id = f"{config_entry.entry_id}_{select_key}"
        self.entity_id = f"select.solakon_one_{select_key}"

        # Set basic attributes
        self._attr_name = definition["name"]
        self._attr_icon = definition.get("icon")

        # Set up options (mapping from numeric value to text)
        self._options_map = definition["options"]  # e.g., {0: "Disable", 2: "EPS Mode"}
        self._reverse_options_map = {v: k for k, v in self._options_map.items()}  # e.g., {"Disable": 0}
        self._attr_options = list(self._options_map.values())  # ["Disable", "EPS Mode"]

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
        return DeviceInfo(
            identifiers={(DOMAIN, self._config_entry.entry_id)},
            name=self._config_entry.data.get("name", "Solakon ONE"),
            manufacturer=self._device_info.get("manufacturer", "Solakon"),
            model=self._device_info.get("model", "One"),
            sw_version=self._device_info.get("version"),
            serial_number=self._device_info.get("serial_number"),
        )

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        if self.coordinator.data and self._select_key in self.coordinator.data:
            raw_value = self.coordinator.data[self._select_key]

            # raw_value is already processed by modbus.py (scaled if needed)
            # For selects, it should be an integer
            if isinstance(raw_value, (int, float)):
                value = int(raw_value)

                # Convert numeric value to string option
                if value in self._options_map:
                    self._attr_current_option = self._options_map[value]
                    _LOGGER.debug(
                        f"{self._select_key}: raw_value={raw_value}, mapped to '{self._attr_current_option}'"
                    )
                else:
                    _LOGGER.warning(
                        f"Unknown value {value} for {self._select_key}. "
                        f"Valid options: {self._options_map}"
                    )
                    self._attr_current_option = None
            else:
                _LOGGER.warning(
                    f"Invalid value type for {self._select_key}: {type(raw_value)}"
                )
                self._attr_current_option = None
        else:
            self._attr_current_option = None

        self.async_write_ha_state()

    async def async_select_option(self, option: str) -> None:
        """Change the selected option."""
        if option not in self._reverse_options_map:
            _LOGGER.error(
                f"Invalid option '{option}' for {self._select_key}. "
                f"Valid options: {list(self._reverse_options_map.keys())}"
            )
            return

        # Get the numeric value to write
        numeric_value = self._reverse_options_map[option]
        address = self._register_config["address"]

        _LOGGER.info(
            f"Setting {self._select_key} at address {address} to '{option}' (value: {numeric_value})"
        )

        # Write the value to the register (single register for selects)
        success = await self._hub.async_write_register(address, numeric_value)

        if success:
            _LOGGER.info(f"Successfully set {self._select_key} to '{option}'")
            # Update the state immediately (optimistic update)
            self._attr_current_option = option
            self.async_write_ha_state()
            # Request coordinator to refresh data to confirm the change
            await self.coordinator.async_request_refresh()
        else:
            _LOGGER.error(f"Failed to set {self._select_key} to '{option}'")

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        # Entity is available if coordinator succeeded and we have a valid value
        return self.coordinator.last_update_success