package systems.rootk.crm;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.List;
import org.junit.Test;

public class IncomingPhoneKeysTest {
    @Test
    public void egyptianFormatsShareTheLastNineDigits() {
        List<String> local = IncomingLeadIndex.phoneKeys("01012345678");
        List<String> plus = IncomingLeadIndex.phoneKeys("+20 101 234 5678");
        List<String> zeroZero = IncomingLeadIndex.phoneKeys("00201012345678");
        assertTrue(local.contains("012345678"));
        assertTrue(plus.contains("012345678"));
        assertTrue(zeroZero.contains("012345678"));
    }

    @Test
    public void shortNumbersAreIgnored() {
        assertTrue(IncomingLeadIndex.phoneKeys("12345").isEmpty());
        assertFalse(IncomingLeadIndex.phoneKeys(null).contains("1234567"));
    }
}
