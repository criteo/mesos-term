import { WebDriver, until, By } from "selenium-webdriver";
import { TIMEOUT_DRIVER } from "./constants";

export async function receiveUnauthorizedErrorMessage(driver: WebDriver) {
  const el = await driver.wait(
    until.elementLocated(By.css(".notification-error .message-content")),
    TIMEOUT_DRIVER
  );
  await driver.wait(
    until.elementTextContains(el, "Unauthorized access"),
    TIMEOUT_DRIVER
  );
}
