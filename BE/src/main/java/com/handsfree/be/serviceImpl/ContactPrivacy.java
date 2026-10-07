package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.*;

import java.util.regex.Pattern;

public final class ContactPrivacy {
    private ContactPrivacy() {}

    private static final Pattern CONTACT =
            Pattern.compile(
                    "(?i)([a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}|(?:https?://|www\\.)[^\\s]+|(?:\\+?84|0)(?:["
                        + " .()\\-]*[0-9]){8,10}|(?:zalo|facebook|telegram|instagram|tiktok|fb|sđt)\\s*[:=]\\s*[^,;\\n"
                        + "]+)");

    public static String redact(String value) {
        return value == null
                ? null
                : CONTACT.matcher(value).replaceAll("[Liên hệ sau khi mở kết nối]");
    }

    public static void validate(String value) {
        if (value != null && CONTACT.matcher(value).find())
            throw new AppException(ErrorCode.CONTACT_NOT_ALLOWED);
    }
}
